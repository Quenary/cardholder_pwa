import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromEvent, map, merge, of, Subscription } from 'rxjs';
import { AppActions } from 'src/app/state/app.actions';

/**
 * Service that maps window network status to ngrx actions
 */
@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private readonly store = inject(Store);
  private subscription: Subscription;
  public init(): void {
    this.subscription?.unsubscribe();
    this.subscription = merge(
      of(navigator.onLine),
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).subscribe((status) => {
      const action = status
        ? AppActions.networkOnline()
        : AppActions.networkOffline();
      this.store.dispatch(action);
    });
  }
}
