import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import type { Result } from '@zxing/library';
import {
  BehaviorSubject,
  catchError,
  first,
  from,
  map,
  Observable,
  retry,
  shareReplay,
  Subscription,
  switchMap,
  throwError,
} from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
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
import { AsyncPipe } from '@angular/common';

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
    TranslateModule,
    MatIcon,
    MatDialogActions,
    MatDialogContent,
    AsyncPipe,
  ],
  templateUrl: './card-scanner.component.html',
  styleUrl: './card-scanner.component.scss',
})
export class CardScannerComponent implements OnInit, OnDestroy {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly reader = new BrowserMultiFormatReader();
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly matBottomSheet = inject(MatBottomSheet);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);

  private readonly devices$: Observable<MediaDeviceInfo[]> = from(
    navigator.mediaDevices.getUserMedia({ video: true })
  ).pipe(
    switchMap(() => from(BrowserMultiFormatReader.listVideoInputDevices())),
    shareReplay(1)
  );
  public readonly selectedDevice$ = new BehaviorSubject<MediaDeviceInfo>(null);
  @ViewChild('video', { static: true, read: ElementRef<HTMLVideoElement> })
  private readonly videoElementRef: ElementRef<HTMLVideoElement>;

  private scanSubscription: Subscription;

  ngOnInit() {
    this.devices$
      .pipe(
        first(),
        map((list) => this.getDefaultDeviceByLabel(list))
      )
      .subscribe({
        next: (device) => {
          this.onSelectSource(device);
        },
        error: () => {
          this.snackService.error(
            this.translateService.instant('CARDS.CARD.SCAN.PERMISSION_ERROR')
          );
        },
      });
  }

  ngOnDestroy(): void {
    this.scanSubscription?.unsubscribe();
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
   * Wrap scan to observable and start it
   * @param deviceId
   * @returns
   */
  private startScanning(deviceId: string): Observable<Result> {
    return this.ngZone.runOutsideAngular(
      () =>
        new Observable((observer) => {
          this.reader
            .decodeFromVideoDevice(
              deviceId,
              this.videoElementRef.nativeElement,
              (result, error, controls) => {
                if (!!result) {
                  observer.next(result);
                }
              }
            )
            .then((controls) => {
              observer.add(() => {
                controls.stop();
              });
            })
            .catch((e) => {
              observer.error(e);
            });
        })
    );
  }

  /**
   * Start scan on video source selection
   * @param device
   */
  private onSelectSource(device: MediaDeviceInfo) {
    this.scanSubscription?.unsubscribe();
    this.selectedDevice$.next(device);
    if (!!device) {
      this.scanSubscription = this.startScanning(device.deviceId)
        .pipe(
          catchError((error) => {
            this.snackService.error(error);
            return throwError(() => error);
          }),
          retry({ count: 1, delay: 1000 })
        )
        .subscribe({
          next: (res) => {
            this.onResult(res);
          },
        });
    }
  }

  /**
   * Callback to scanner result
   * @param res
   * @returns
   */
  private onResult(res: Result): void {
    if (!res) {
      return;
    }
    const text = res.getText();
    const intFormat = res.getBarcodeFormat();
    const format = Object.entries(BarcodeFormat).find(
      ([key, value]) => value === intFormat
    )[0];
    this.close({
      text,
      format,
    });
  }

  /**
   * Callback to file selection
   * @param $event
   * @returns
   */
  public decodeFromFile($event: Event & { target: HTMLInputElement }) {
    const file = $event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const image = new Image();
      image.src = e.target.result as string;
      this.reader
        .decodeFromImageElement(image)
        .then((res) => {
          this.onResult(res);
        })
        .catch((error) => {
          this.snackService.error(error);
        });
    };
    reader.readAsDataURL(file);
  }

  public close($event?: ICardScannerResult) {
    this.matDialogRef.close($event);
  }

  public onClickSelectDevice(): void {
    this.devices$.pipe(first()).subscribe((devices) => {
      this.matBottomSheet
        .open(CardScannerDeviceSheetComponent, {
          data: {
            devices,
          },
        })
        .afterDismissed()
        .subscribe((data?: { device: MediaDeviceInfo }) => {
          if (data?.device) {
            this.onSelectSource(data.device);
          }
        });
    });
  }
}
