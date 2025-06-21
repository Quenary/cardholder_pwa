import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { first } from 'rxjs';
import { selectUserIsAdmin } from 'src/app/entities/user/state/user.selectors';

export const adminGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  return store.select(selectUserIsAdmin).pipe(first());
};
