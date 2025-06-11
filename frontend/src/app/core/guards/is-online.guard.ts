import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { first } from 'rxjs';
import { selectAppIsOnline } from 'src/app/state/app.selectors';

export const isOnlineGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  return store.select(selectAppIsOnline).pipe(first());
};
