import { Component, ElementRef, forwardRef, viewChild } from '@angular/core';
import { CardScannerBaseComponent } from '../card-scanner-base/card-scanner-base.component';
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';
import { Observable, of } from 'rxjs';
import { ZxingToBwipMap } from 'src/app/entities/cards/cards-const';
import { IScannerResult } from '../card-scanner-base/scanner-interface';

@Component({
  selector: 'app-card-scanner-zxing',
  providers: [
    {
      provide: CardScannerBaseComponent,
      useValue: forwardRef(() => CardScannerZxingComponent),
      multi: true,
    },
  ],
  templateUrl: './card-scanner-zxing.component.html',
  styleUrl: './card-scanner-zxing.component.scss',
})
export class CardScannerZxingComponent extends CardScannerBaseComponent {
  private readonly reader = new BrowserMultiFormatReader();

  private readonly videoRef = viewChild.required<
    unknown,
    ElementRef<HTMLVideoElement>
  >('video', { read: ElementRef });

  public override scanFile(file: File): Observable<IScannerResult | null> {
    if (!file) {
      return of(null);
    }
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = ($event) => {
        const image = new Image();
        image.src = $event.target.result as string;
        this.reader
          .decodeFromImageElement(image)
          .then((res) => {
            if (res) {
              observer.next(this.prepareResult(res));
            } else {
              observer.next(null);
            }
            observer.complete();
          })
          .catch((error) => {
            observer.error(error);
          });
      };
      reader.onerror = (error) => {
        observer.error(error);
      };
      reader.readAsDataURL(file);
    });
  }

  protected override start(deviceId: string): Observable<IScannerResult> {
    return new Observable((observer) => {
      this.reader
        .decodeFromVideoDevice(
          deviceId,
          this.videoRef().nativeElement,
          (result) => {
            if (result) {
              observer.next(this.prepareResult(result));
            }
          },
        )
        .then((controls) => {
          observer.add(() => {
            controls.stop();
          });
        })
        .catch((e) => {
          observer.error(e);
        });
    });
  }

  protected override prepareResult(result: Result): IScannerResult {
    const code = result.getText();
    const intFormat = result.getBarcodeFormat();
    const zFormat = Object.entries(BarcodeFormat).find(
      ([_, value]) => value === intFormat,
    )[0];
    const type = ZxingToBwipMap[zFormat];
    return {
      code,
      type,
    };
  }
}
