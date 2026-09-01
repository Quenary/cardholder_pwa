import { Injectable } from '@angular/core';

/**
 * Wrapper for the vibration api.
 *
 * Same shape as MediaDevicesService: it does nothing at all where the
 * platform has no vibrator, which includes every browser on iOS.
 */
@Injectable({
  providedIn: 'root',
})
export class HapticsService {
  /**
   * Short buzz confirming something was read.
   *
   * Long enough to be felt through a hand already holding a card, short
   * enough not to read as an alarm.
   */
  confirm(): void {
    if (typeof navigator?.vibrate === 'function') {
      navigator.vibrate(60);
    }
  }
}
