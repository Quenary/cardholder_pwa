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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import type { Result } from '@zxing/library';
import {
  catchError,
  first,
  from,
  map,
  Observable,
  retry,
  Subscription,
  throwError,
} from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ICardScannerResult {
  text: string;
  format: string;
}

@Component({
  selector: 'app-card-scanner',
  imports: [
    MatButton,
    TranslateModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatButton,
    MatChipListbox,
    MatChipOption,
  ],
  templateUrl: './card-scanner.component.html',
  styleUrl: './card-scanner.component.scss',
})
export class CardScannerComponent implements OnInit, OnDestroy {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly reader = new BrowserMultiFormatReader();
  private readonly destroyRef = inject(DestroyRef);
  private readonly matSnackBar = inject(MatSnackBar);
  private readonly translateService = inject(TranslateService);
  private readonly ngZone = inject(NgZone);

  public readonly devices$: Observable<MediaDeviceInfo[]> = from(
    BrowserMultiFormatReader.listVideoInputDevices()
  );
  public readonly deviceControl = new FormControl<MediaDeviceInfo>(null);
  @ViewChild('video', { static: true, read: ElementRef<HTMLVideoElement> })
  private readonly videoElementRef: ElementRef<HTMLVideoElement>;

  private scanSubscription: Subscription;

  ngOnInit() {
    this.devices$
      .pipe(
        first(),
        map((list) => this.getDefaultDeviceByLabel(list))
      )
      .subscribe((device) => {
        this.deviceControl.setValue(device, { emitEvent: false });
        this.onSelectSource(device);
      });
    this.deviceControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((device) => {
        this.onSelectSource(device);
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

  public onSelectSource($event: MediaDeviceInfo) {
    this.scanSubscription?.unsubscribe();
    if (!!$event) {
      this.scanSubscription = this.startScanning($event.deviceId)
        .pipe(
          catchError((error) => {
            this.matSnackBar.open(
              error,
              this.translateService.instant('GENERAL.CLOSE'),
              { duration: 10000 }
            );
            return throwError(() => error);
          }),
          retry(2)
        )
        .subscribe({
          next: (res) => {
            if (res) {
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
          },
        });
    }
  }

  public close($event?: ICardScannerResult) {
    this.matDialogRef.close($event);
  }
}
