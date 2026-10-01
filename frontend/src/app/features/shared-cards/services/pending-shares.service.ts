import { computed, inject, Injectable, signal } from '@angular/core';
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

  private readonly _count = signal(0);
  readonly count = computed(() => this._count());

  /**
   * Ask again. A failure keeps the last count: the badge is a hint, and an
   * offline app or a closed session is not worth an error of its own.
   */
  refresh(): void {
    this.cardShareApiService.getCardsSharedWithMe('pending').subscribe({
      next: (items) => this._count.set(items.length),
      error: () => undefined,
    });
  }

  clear(): void {
    this._count.set(0);
  }
}
