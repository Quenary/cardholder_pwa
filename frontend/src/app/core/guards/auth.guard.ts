import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { first, map, tap } from 'rxjs';
import { IAppState } from 'src/app/app.state';
import { selectAuthTokenResponse } from 'src/app/entities/auth/state/auth.selectors';

export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store<IAppState>);
  const router = inject(Router);
  return store.select(selectAuthTokenResponse).pipe(
    first(),
    map((tokenResponse) => !!tokenResponse),
    tap((res) => {
      if (!res) {
        router.navigate(['/auth']);
      }
    })
  );
};
