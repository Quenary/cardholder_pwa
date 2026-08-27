import {
  Component,
  effect,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { catchError, from, map, of, switchMap, tap } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import {
  MatListItem,
  MatListItemTitle,
  MatActionList,
} from '@angular/material/list';
import {
  MatBottomSheet,
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { SnackService } from 'src/app/core/services/snack.service';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CardScannerZxingComponent } from './card-scanner-zxing/card-scanner-zxing.component';
import { CardScannerQuagga2Component } from './card-scanner-quagga2/card-scanner-quagga2.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CardScannerBaseComponent } from './card-scanner-base/card-scanner-base.component';
import {
  EScanner,
  IScanner,
  IScannerResult,
} from './card-scanner-base/scanner-interface';
import { CardScannerHelpDialogComponent } from './card-scanner-help-dialog/card-scanner-help-dialog.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { MediaDevicesService } from 'src/app/core/services/media-devices.service';

export interface ICardScannerResult {
  text: string;
  format: string;
}

@Component({
  selector: 'app-card-scanner-device-sheet',
  imports: [MatListItem, MatListItemTitle, MatActionList],
  template: `
    <mat-action-list>
      @for (device of devices; track device.deviceId) {
      <mat-list-item (click)="onSelectDevice(device)">
        <span matListItemTitle>
          {{ device.label }}
        </span>
      </mat-list-item>
      }
    </mat-action-list>
  `,
})
export class CardScannerDeviceSheetComponent {
  private readonly matBottomSheetRef = inject(MatBottomSheetRef);
  private readonly data = inject(MAT_BOTTOM_SHEET_DATA);

  protected readonly devices: MediaDeviceInfo[] = this.data.devices ?? [];

  protected onSelectDevice(device: MediaDeviceInfo): void {
    this.matBottomSheetRef.dismiss({ device });
  }
}

/**
 * How long a scanner keeps the camera before the other one is tried.
 * Long enough to frame a code and hold still, short enough that a user
 * does not give up first.
 */
const SCANNER_FALLBACK_MS = 5000;

@Component({
  selector: 'app-card-scanner',
  imports: [
    MatButton,
    MatIconButton,
    TranslatePipe,
    MatIcon,
    MatDialogActions,
    MatDialogContent,
    MatButtonToggleModule,
    MatProgressSpinner,
    CardScannerZxingComponent,
    CardScannerQuagga2Component,
    NgTemplateOutlet,
  ],
  templateUrl: './card-scanner.component.html',
  styleUrl: './card-scanner.component.scss',
})
export class CardScannerComponent implements OnDestroy {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly matBottomSheet = inject(MatBottomSheet);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);
  private readonly matDialog = inject(MatDialog);
  private readonly mediaDevicesService = inject(MediaDevicesService);

  protected readonly EScanner = EScanner;
  /**
   * List of scanners
   */
  protected readonly scanners: IScanner[] = [
    {
      name: 'Zxing',
      code: EScanner.ZXING,
    },
    {
      name: 'Quagga2',
      code: EScanner.QUAGGA2,
    },
  ];
  /**
   * Selected scanner
   */
  protected readonly selectedScanner = signal<IScanner>(this.scanners[0]);
  /**
   * Time left on the camera before handing over to the other scanner,
   * see scheduleScannerFallback.
   */
  private fallbackTimer: ReturnType<typeof setTimeout> = null;
  /** Set once the switch has happened, or once the user has had their say. */
  private fallbackDone = false;
  /**
   * Selected media device
   */
  protected readonly selectedDevice = signal<MediaDeviceInfo>(null);

  private readonly scannerComponent = viewChild<
    CardScannerBaseComponent,
    CardScannerBaseComponent
  >('scanner', { read: CardScannerBaseComponent });

  /**
   * Device id the platform granted for the rear camera request, when it
   * reports one. Used as the default camera, see getDefaultDevice.
   */
  private readonly grantedDeviceId = signal<string>(null);

  /**
   * Media device list.
   * That is also initiates permission dialog.
   */
  private readonly devices = toSignal(
    from(
      this.mediaDevicesService.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      }),
    ).pipe(
      tap((stream) => this.readGrantedDevice(stream)),
      switchMap(() => from(this.mediaDevicesService.enumerateDevices())),
      map((res) =>
        (res || []).filter((d) => !d.kind || d.kind.includes('video')),
      ),
      catchError(() => {
        this.snackService.error(
          this.translateService.instant('CARDS.CARD.SCAN.PERMISSION_ERROR'),
        );
        return of([]);
      }),
    ),
    { initialValue: [] },
  );

  constructor() {
    effect(() => {
      const devices = this.devices();
      const device = this.selectedDevice();
      if (devices.length && !device) {
        const device = this.getDefaultDevice(devices);
        this.selectedDevice.set(device);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearFallbackTimer();
    this.matBottomSheet.dismiss();
  }

  /**
   * The active scanner reports its camera is up: only from here does the
   * countdown mean anything. Starting it at device selection would have
   * spent most of it on the deferred chunk and on getUserMedia.
   */
  protected onScannerStarted(): void {
    this.scheduleScannerFallback();
  }

  /**
   * Hands the camera over to the other scanner if the current one has read
   * nothing after a while.
   *
   * Zxing reads 2D codes and Quagga2 reads more 1D formats, which is not
   * something a user can be expected to know from the code in front of them.
   * Trying the other one is what they end up doing by hand anyway.
   *
   * Held back whenever the user is not actually pointing the camera at a
   * code, and dropped for good once the choice becomes theirs.
   */
  private scheduleScannerFallback(): void {
    this.clearFallbackTimer();
    if (this.fallbackDone) {
      return;
    }
    this.fallbackTimer = setTimeout(() => {
      this.fallbackTimer = null;
      this.fallbackDone = true;
      const current = this.selectedScanner();
      const other = this.scanners.find((s) => s.code !== current.code);
      if (other) {
        this.selectedScanner.set(other);
      }
    }, SCANNER_FALLBACK_MS);
  }

  private clearFallbackTimer(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  /**
   * Holds the countdown while the user is away from the live camera: the
   * file picker, the help dialog, the camera sheet. It restarts when the
   * scanner reports it is running again.
   */
  private suspendScannerFallback(): void {
    this.clearFallbackTimer();
  }

  /**
   * Drops the automatic switch for the rest of the dialog.
   */
  private cancelScannerFallback(): void {
    this.clearFallbackTimer();
    this.fallbackDone = true;
  }

  /**
   * Any click on the toggle group, even one that does not change the value:
   * clicking the active scanner is how a user says "stay on this one", and
   * mat-button-toggle-group emits nothing in that case.
   */
  protected onScannerToggleClick(): void {
    this.cancelScannerFallback();
  }

  /**
   * The toggle group also emits when it syncs itself with [value] on init,
   * which is not a choice anyone made - only an actual change is.
   */
  protected onSelectScanner(scanner: IScanner): void {
    if (!scanner || scanner.code === this.selectedScanner().code) {
      return;
    }
    this.cancelScannerFallback();
    this.selectedScanner.set(scanner);
  }

  /**
   * Callback to scanner result
   * @param res
   * @returns
   */
  protected onResult(res: IScannerResult): void {
    if (!res) {
      return;
    }
    this.cancelScannerFallback();
    this.close({
      text: res.code,
      format: res.type,
    });
  }

  /**
   * Callback to file selection
   * @param $event
   * @returns
   */
  protected async decodeFromFile($event: Event & { target: HTMLInputElement }) {
    const file = $event.target.files[0];
    if (!file) {
      return;
    }
    const comp = this.scannerComponent();
    if (comp) {
      comp.scanFile(file).subscribe({
        next: (res) => {
          if (res) {
            this.onResult(res);
          } else {
            this.scheduleScannerFallback();
          }
        },
        error: (error) => {
          this.snackService.error(error);
          this.scheduleScannerFallback();
        },
      });
    }
  }

  /**
   * The system file picker is about to take over. No event tells us it was
   * dismissed, so the countdown only comes back on a finished file scan.
   */
  protected onPickFile(): void {
    this.suspendScannerFallback();
  }

  protected close($event?: ICardScannerResult) {
    this.matDialogRef.close($event);
  }

  protected onClickSelectDevice(): void {
    this.suspendScannerFallback();
    const devices = this.devices();
    this.matBottomSheet
      .open(CardScannerDeviceSheetComponent, {
        data: {
          devices,
        },
      })
      .afterDismissed()
      .subscribe((data?: { device: MediaDeviceInfo }) => {
        if (data?.device) {
          this.selectedDevice.set(data.device);
        }
        this.scheduleScannerFallback();
      });
  }

  protected openScannersHelp() {
    this.suspendScannerFallback();
    this.matDialog
      .open(CardScannerHelpDialogComponent)
      .afterClosed()
      .subscribe(() => this.scheduleScannerFallback());
  }

  /**
   * Keeps the camera the platform actually granted, then releases the stream:
   * it was only opened to raise the permission dialog and to read that id.
   */
  private readGrantedDevice(stream: MediaStream): void {
    const track = stream?.getVideoTracks?.()?.[0];
    this.grantedDeviceId.set(track?.getSettings?.()?.deviceId || null);
    stream?.getTracks?.().forEach((t) => t.stop());
  }

  /**
   * Default camera.
   *
   * Matching on the label alone is not enough on Android: phones expose
   * several rear cameras (wide, ultra wide, telephoto, depth) and they all
   * carry "back" in their label, so the first match is often the ultra wide
   * one, which cannot focus close enough to read a barcode.
   *
   * The rear camera request above lets the platform pick the main one, so
   * prefer the device it granted and keep the label match as a fallback for
   * browsers that report no device id.
   */
  private getDefaultDevice(devices: MediaDeviceInfo[]): MediaDeviceInfo {
    if (!devices?.length) {
      return null;
    }
    const grantedId = this.grantedDeviceId();
    const granted = grantedId
      ? devices.find((d) => d.deviceId === grantedId)
      : undefined;
    return (
      granted ??
      devices.find((d) => /back|rear|environment/i.test(d.label)) ??
      devices[0]
    );
  }
}
