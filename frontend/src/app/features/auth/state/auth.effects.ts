import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthActions } from './auth.actions';
import { AuthApiService } from 'src/app/entities/auth/auth-api.service';
import { catchError, map, of, switchMap, tap } from 'rxjs';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private authApiService: AuthApiService
  ) {}

  token$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.token),
      switchMap((action) =>
        this.authApiService.token(action.body).pipe(
          map((tokenResponse) => AuthActions.tokenSuccess({ tokenResponse })),
          catchError((error) => of(AuthActions.tokenError({ error })))
        )
      )
    )
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      switchMap((action) =>
        this.authApiService.tokenRefresh(action.refreshToken).pipe(
          map((tokenResponse) =>
            AuthActions.refreshTokenSuccess({ tokenResponse })
          ),
          catchError((error) => of(AuthActions.refreshTokenError({ error })))
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      switchMap((action) =>
        this.authApiService.logout(action.refreshToken).pipe(
          map(() => AuthActions.logoutSuccess()),
          catchError((error) => of(AuthActions.logoutError))
        )
      )
    )
  );

  showErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          AuthActions.tokenError,
          AuthActions.refreshTokenError,
          AuthActions.logoutError
        ),
        tap((action) => {
            console.log(action.error)
            // TODO
        })
      ),
    { dispatch: false }
  );
}
