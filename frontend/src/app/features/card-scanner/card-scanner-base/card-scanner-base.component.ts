import {
  Directive,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { IScannerResult } from './scanner-interface';
import { SnackService } from 'src/app/core/services/snack.service';

@Directive()
export abstract class CardScannerBaseComponent
  implements OnInit, OnChanges, OnDestroy
{
  protected readonly ngZone = inject(NgZone);
  protected readonly snackService = inject(SnackService);

  /**
   * Camera device id
   */
  @Input()
  deviceId: string = null;
  /**
   * Event on success scan
   */
  @Output() readonly OnSuccess = new EventEmitter<IScannerResult>();
  /**
   * Subscription of scan observable
   */
  protected subscription: Subscription;

  ngOnInit(): void {
    this.subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.deviceId.firstChange) {
      this.subscribe();
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Method to subscribe to scanner.
   * Call it in ngOnInit and ngOnChanges.
   */
  protected subscribe(): void {
    this.subscription?.unsubscribe();
    if (this.deviceId) {
      this.subscription = this.ngZone.runOutsideAngular(() =>
        this.start().subscribe({
          next: (res) => {
            this.OnSuccess.emit(res);
          },
          error: (error) => {
            this.snackService.error(error);
          },
        }),
      );
    }
  }

  /**
   * Start snac from media device
   * @param options
   */
  protected abstract start(): Observable<IScannerResult>;

  /**
   * Scan from file
   * @param file file
   */
  public abstract scanFile(file: File): Observable<IScannerResult | null>;

  /**
   * Method for preparing lib specific result to universal.
   * @param result lib specific result of scan
   * @returns universal result
   */
  protected abstract prepareResult(result: unknown): IScannerResult;
}
