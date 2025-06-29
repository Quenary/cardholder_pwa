import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  imports: [MatListItem, MatListItemTitle, MatActionList, TranslateModule],
  template: `
    <mat-action-list>
      @for (device of devices; track device) {
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

  public readonly devices: MediaDeviceInfo[] = this.data.devices ?? [];

  onSelectDevice(device: MediaDeviceInfo): void {
    this.matBottomSheetRef.dismiss({ device });
  }
}

@Component({
  selector: 'app-card-scanner',
  imports: [
    MatButton,
    MatIconButton,
    TranslateModule,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardScannerComponent implements OnDestroy {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly matBottomSheet = inject(MatBottomSheet);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);
  private readonly matDialog = inject(MatDialog);
  private readonly mediaDevicesService = inject(MediaDevicesService);

  public readonly EScanner = EScanner;
  @ViewChild('scanner', {
    static: false,
  })
  private scannerComponent: CardScannerBaseComponent;

  /**
   * List of scanners
   */
  public readonly scanners: IScanner[] = [
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
  public readonly selectedScanner = signal<IScanner>(this.scanners[0]);
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
  /**
   * Selected media device
   */
  public readonly selectedDevice = signal<MediaDeviceInfo>(null);

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

  private getDefaultDeviceByLabel(devices: MediaDeviceInfo[]): MediaDeviceInfo {
    if (!devices?.length) {
      return null;
    }
    return (
      devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[0]
    );
  }

  /**
   * Callback to scanner result
   * @param res
   * @returns
   */
  public onResult(res: IScannerResult): void {
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
  public async decodeFromFile($event: Event & { target: HTMLInputElement }) {
    const file = $event.target.files[0];
    if (!file) {
      return;
    }
    if (this.scannerComponent) {
      this.scannerComponent.scanFile(file).subscribe({
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

  public close($event?: ICardScannerResult) {
    this.matDialogRef.close($event);
  }

  public onClickSelectDevice(): void {
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

  openScannersHelp() {
    this.matDialog.open(CardScannerHelpDialogComponent);
  }
}
