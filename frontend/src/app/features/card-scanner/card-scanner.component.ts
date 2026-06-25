import {
  Component,
  effect,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { catchError, from, map, of, switchMap } from 'rxjs';
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
   * Selected media device
   */
  protected readonly selectedDevice = signal<MediaDeviceInfo>(null);

  private readonly scannerComponent = viewChild.required<
    unknown,
    CardScannerBaseComponent
  >('scanner', { read: CardScannerBaseComponent });

  /**
   * Media device list.
   * That is also initiates permission dialog.
   */
  private readonly devices = toSignal(
    from(this.mediaDevicesService.getUserMedia({ video: true })).pipe(
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
        const device = this.getDefaultDeviceByLabel(devices);
        this.selectedDevice.set(device);
      }
    });
  }

  ngOnDestroy(): void {
    this.matBottomSheet.dismiss();
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
    if (this.scannerComponent) {
      this.scannerComponent()
        .scanFile(file)
        .subscribe({
          next: (res) => {
            if (res) {
              this.onResult(res);
            }
          },
          error: (error) => {
            this.snackService.error(error);
          },
        });
    }
  }

  protected close($event?: ICardScannerResult) {
    this.matDialogRef.close($event);
  }

  protected onClickSelectDevice(): void {
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
      });
  }

  protected openScannersHelp() {
    this.matDialog.open(CardScannerHelpDialogComponent);
  }

  private getDefaultDeviceByLabel(devices: MediaDeviceInfo[]): MediaDeviceInfo {
    if (!devices?.length) {
      return null;
    }
    return (
      devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[0]
    );
  }
}
