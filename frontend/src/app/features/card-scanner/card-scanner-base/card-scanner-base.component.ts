import {
  Directive,
  effect,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { IScannerResult } from './scanner-interface';
import { SnackService } from 'src/app/core/services/snack.service';

@Directive()
export abstract class CardScannerBaseComponent implements OnDestroy {
  protected readonly snackService = inject(SnackService);

  /**
   * Camera device id
   */
  public readonly deviceId = input.required<string>();
  /**
   * Event on success scan
   */
  public readonly OnSuccess = output<IScannerResult>();
  /**
   * Emitted once the camera is running and frames are being decoded.
   * Subclasses report it from start(), when their library says so.
   */
  public readonly OnStart = output<void>();

  /**
   * Subscription of scan observable
   */
  protected subscription: Subscription;

  constructor() {
    effect(() => {
      const deviceId = this.deviceId();
      this.subscribe(deviceId);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Method to subscribe to scanner.
   * Call it in ngOnInit and ngOnChanges.
   */
  protected subscribe(deviceId: string): void {
    this.subscription?.unsubscribe();
    if (deviceId) {
      // Assigning matters: the teardown that releases the camera is
      // registered on the observer, so it only runs on unsubscribe.
      this.subscription = this.start(deviceId).subscribe({
        next: (res) => {
          this.OnSuccess.emit(res);
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
    }
  }

  /**
   * Report that the camera is up. To be called by start() implementations.
   */
  protected notifyStarted(): void {
    this.OnStart.emit();
  }

  /**
   * Scan from file
   * @param file file
   */
  public abstract scanFile(file: File): Observable<IScannerResult | null>;

  /**
   * Start scanning from media device
   * @param options
   */
  protected abstract start(deviceId: string): Observable<IScannerResult>;

  /**
   * Method for preparing lib specific result to universal.
   * @param result lib specific result of scan
   * @returns universal result
   */
  protected abstract prepareResult(result: unknown): IScannerResult;
}
