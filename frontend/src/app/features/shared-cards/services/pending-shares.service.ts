import { computed, inject, Injectable } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { filter, fromEvent, map } from 'rxjs';
import { selectAuthIsAuthorized } from 'src/app/entities/auth/state/auth.selectors';
import { CardShareApiService } from './card-share-api.service';

/**
 * How many shares wait for the user to accept or decline them, for the badge
 * on the navigation entry.
 */
@Injectable({
  providedIn: 'root',
})
export class PendingSharesService {
  private readonly cardShareApiService = inject(CardShareApiService);
  private readonly isAuthorized = inject(Store).selectSignal(
    selectAuthIsAuthorized,
  );

  /**
   * Changes on every tab focus, so it can be read into the request below:
   * somebody coming back to the app is when they would notice a share that
   * arrived in the meantime.
   */
  private readonly focusedAt = toSignal(
    fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible'),
    ),
  );

  /**
   * Just the count, not the full list: this only feeds a badge. Idle while
   * logged out, so a closed session is not worth a request of its own; loads
   * again on login and on every tab focus, since the request object changes
   * each time either does.
   */
  private readonly countResource = rxResource({
    params: () =>
      this.isAuthorized() ? { focusedAt: this.focusedAt() } : undefined,
    stream: () =>
      this.cardShareApiService
        .getCardsSharedWithMeCount('pending')
        .pipe(map((r) => r.count)),
    defaultValue: 0,
  });

  /**
   * A failure hides the badge rather than erroring: it's a hint, not
   * critical state, and an offline app is not worth an error of its own.
   */
  readonly count = computed(() =>
    this.countResource.error() ? 0 : this.countResource.value(),
  );

  /** Ask again right away, e.g. after a share was answered or sent. */
  refresh(): void {
    this.countResource.reload();
  }
}
