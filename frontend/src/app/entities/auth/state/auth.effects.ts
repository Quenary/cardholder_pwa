import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthActions } from './auth.actions';
import { AuthApiService } from 'src/app/entities/auth/auth-api.service';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { ELocalStorageKey } from 'src/app/app.consts';
import { Router } from '@angular/router';
import { SnackService } from 'src/app/core/services/snack.service';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authApiService = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly snackService = inject(SnackService);

  token$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.token),
      switchMap((action) =>
        this.authApiService.token(action.body).pipe(
          tap(() => {
            this.router.navigate(['/cards']);
          }),
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
          catchError((error) => {
            this.onLogout();
            return of(AuthActions.refreshTokenError({ error }));
          })
        )
      )
    )
  );

  saveTokens$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.tokenSuccess, AuthActions.refreshTokenSuccess),
        tap((action) => {
          localStorage.setItemJson(
            ELocalStorageKey.TOKEN_RESPONSE,
            action.tokenResponse
          );
        })
      ),
    { dispatch: false }
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      switchMap((action) =>
        this.authApiService.logout(action.refreshToken).pipe(
          map(() => AuthActions.logoutSuccess()),
          catchError((error) => of(AuthActions.logoutError({ error }))),
          finalize(() => {
            this.onLogout();
          })
        )
      )
    )
  );

  $logoutSilent = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSilent),
        tap(() => {
          this.onLogout();
        })
      ),
    { dispatch: false }
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
          this.snackService.error(action.error);
        })
      ),
    { dispatch: false }
  );

  /**
   * Callback for logout, refresh error, user deletion etc.
   */
  private onLogout() {
    localStorage.removeItem(ELocalStorageKey.TOKEN_RESPONSE);
    this.router.navigate(['/auth']);
  }
}
