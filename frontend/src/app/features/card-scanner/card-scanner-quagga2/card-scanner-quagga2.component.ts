import { Component, ElementRef, forwardRef, inject } from '@angular/core';
import {
  QuaggaJSCodeReader,
  QuaggaJSResultCallbackFunction,
  QuaggaJSResultObject_CodeResult,
} from '@ericblade/quagga2';
import { Observable, of } from 'rxjs';
import { Quagga2ToBwipMap } from 'src/app/entities/cards/cards-const';
import Quagga2 from '@ericblade/quagga2';
import { CardScannerBaseComponent } from '../card-scanner-base/card-scanner-base.component';
import { IScannerResult } from '../card-scanner-base/scanner-interface';

@Component({
  selector: 'app-card-scanner-quagga2',
  imports: [],
  providers: [
    {
      provide: CardScannerBaseComponent,
      useValue: forwardRef(() => CardScannerQuagga2Component),
      multi: true,
    },
  ],
  standalone: true,
  templateUrl: './card-scanner-quagga2.component.html',
  styleUrl: './card-scanner-quagga2.component.scss',
})
export class CardScannerQuagga2Component extends CardScannerBaseComponent {
  private readonly host = inject(ElementRef);

  private readonly readers: QuaggaJSCodeReader[] = [
    'code_128_reader',
    'ean_reader',
    'ean_5_reader',
    'ean_2_reader',
    'ean_8_reader',
    'code_39_reader',
    'code_39_vin_reader',
    'codabar_reader',
    'upc_reader',
    'upc_e_reader',
    'i2of5_reader',
    '2of5_reader',
    'code_93_reader',
    'code_32_reader',
  ];

  protected override start(): Observable<IScannerResult> {
    return new Observable((observer) => {
      Quagga2.init({
        inputStream: {
          target: this.host.nativeElement,
          constraints: {
            deviceId: this.deviceId,
            facingMode: 'environment',
          },
        },
        decoder: {
          readers: this.readers,
        },
      })
        .then(() => {
          Quagga2.start();
          const onDetected: QuaggaJSResultCallbackFunction = (data) => {
            if (data?.codeResult) {
              observer.next(this.prepareResult(data.codeResult));
            }
          };
          Quagga2.onDetected(onDetected);
          observer.add(() => {
            Quagga2.offDetected(onDetected);
            Quagga2.stop();
          });
        })
        .catch((error) => {
          Quagga2.stop();
          observer.error(error);
        });
    });
  }

  public override scanFile(file: File): Observable<IScannerResult | null> {
    if (!file) {
      return of(null);
    }
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = ($event) => {
        Quagga2.decodeSingle(
          {
            decoder: {
              readers: this.readers,
            },
            src: $event.target.result as string,
          },
          (data) => {
            if (data?.codeResult) {
              observer.next(this.prepareResult(data.codeResult));
            } else {
              observer.next(null);
            }
            observer.complete();
          },
        );
      };
      reader.onerror = (error) => {
        observer.error(error);
      };
      reader.readAsDataURL(file);
    });
  }

  public override prepareResult(
    result: QuaggaJSResultObject_CodeResult,
  ): IScannerResult {
    return {
      code: result.code,
      type: Quagga2ToBwipMap[result.format],
    };
  }
}
