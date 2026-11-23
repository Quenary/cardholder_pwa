import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthActions } from './auth.actions';
import { AuthApiService } from 'src/app/entities/auth/auth-api.service';
import {
  catchError,
  defer,
  filter,
  finalize,
  firstValueFrom,
  fromEvent,
  from,
  map,
  of,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { ELocalStorageKey } from 'src/app/app.consts';
import { Router } from '@angular/router';
import { SnackService } from 'src/app/core/services/snack.service';
import { selectAuthTokenResponse } from './auth.selectors';
import { Store } from '@ngrx/store';
import { UserActions } from '../../user/state/user.actions';
import {
  isTwoFactorChallenge,
  ITokenResponse,
} from 'src/app/entities/auth/auth-interface';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { selectAuthTwoFactorChallenge } from './auth.selectors';
import { refreshTokensOnce } from 'src/app/shared/functions/refresh-tokens-once.function';
import { clearApiCache } from 'src/app/shared/functions/clear-api-cache.function';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authApiService = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly snackService = inject(SnackService);
  private readonly store = inject(Store);
  private readonly translateService = inject(TranslateService);

  readonly token$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.token),
      switchMap((action) =>
        this.authApiService.token(action.body).pipe(
          map((response) =>
            isTwoFactorChallenge(response)
              ? AuthActions.tokenTwoFactorRequired({ challenge: response })
              : AuthActions.tokenSuccess({ tokenResponse: response }),
          ),
          catchError((error) => of(AuthActions.tokenError({ error }))),
        ),
      ),
    ),
  );

  /**
   * Both the password step and the code step land here, and only here
   * does a successful login leave the form.
   */
  readonly navigateAfterLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.tokenSuccess),
        tap(() => {
          this.router.navigate(['/cards']);
        }),
      ),
    { dispatch: false },
  );

  readonly tokenTwoFactor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.tokenTwoFactor),
      withLatestFrom(this.store.select(selectAuthTwoFactorChallenge)),
      switchMap(([action, challenge]) =>
        this.authApiService
          .tokenTwoFactor({
            challenge_token: challenge?.token ?? '',
            code: action.code,
          })
          .pipe(
            map((tokenResponse) => AuthActions.tokenSuccess({ tokenResponse })),
            catchError((error: HttpErrorResponse) => {
              if (this.isExpiredChallenge(error)) {
                this.snackService.error(
                  this.translateService.instant('AUTH.TWO_FACTOR.EXPIRED'),
                );
                return of(AuthActions.tokenTwoFactorCancel());
              }
              return of(AuthActions.tokenTwoFactorError({ error }));
            }),
          ),
      ),
    ),
  );

  readonly refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      switchMap((action) =>
        defer(() =>
          from(
            refreshTokensOnce(action.refreshToken, () =>
              firstValueFrom(
                this.authApiService.tokenRefresh(action.refreshToken),
              ),
            ),
          ),
        ).pipe(
          map((tokenResponse) =>
            AuthActions.refreshTokenSuccess({ tokenResponse }),
          ),
          catchError((error) => {
            this.onLogout();
            return of(AuthActions.refreshTokenError({ error }));
          }),
        ),
      ),
    ),
  );

  /**
   * Another tab refreshed: take its tokens, since the refresh token this tab
   * holds has been rotated and is no longer good. Only a tab that is logged
   * in follows, and only to newer tokens, never to a logout.
   */
  readonly syncTokens$ = createEffect(() =>
    fromEvent<StorageEvent>(window, 'storage').pipe(
      filter(
        (event) =>
          event.storageArea === localStorage &&
          event.key === ELocalStorageKey.TOKEN_RESPONSE &&
          !!event.newValue,
      ),
      withLatestFrom(this.store.select(selectAuthTokenResponse)),
      filter(([_, current]) => !!current),
      map(([event]) => {
        try {
          return JSON.parse(event.newValue) as ITokenResponse;
        } catch {
          return null;
        }
      }),
      filter((tokenResponse) => !!tokenResponse?.access_token),
      map((tokenResponse) => AuthActions.tokensSynced({ tokenResponse })),
    ),
  );

  readonly getUserInfo = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.tokenSuccess),
        tap(() => {
          this.store.dispatch(UserActions.read());
        }),
      ),
    { dispatch: false },
  );

  readonly saveTokens$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          AuthActions.tokenSuccess,
          AuthActions.refreshTokenSuccess,
          AuthActions.tokensReplaced,
        ),
        tap((action) => {
          localStorage.setItemJson(
            ELocalStorageKey.TOKEN_RESPONSE,
            action.tokenResponse,
          );
        }),
      ),
    { dispatch: false },
  );

  readonly logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      withLatestFrom(this.store.select(selectAuthTokenResponse)),
      switchMap(([_, tokens]) =>
        this.authApiService.logout(tokens.refresh_token).pipe(
          map(() => AuthActions.logoutSuccess()),
          catchError((error) => of(AuthActions.logoutError({ error }))),
          finalize(() => {
            this.onLogout();
          }),
        ),
      ),
    ),
  );

  readonly $logoutSilent = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSilent),
        tap(() => {
          this.onLogout();
        }),
      ),
    { dispatch: false },
  );

  readonly showErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          AuthActions.tokenError,
          AuthActions.tokenTwoFactorError,
          AuthActions.refreshTokenError,
          AuthActions.logoutError,
        ),
        tap((action) => {
          this.snackService.error(action.error);
        }),
      ),
    { dispatch: false },
  );

  /**
   * Callback for logout, refresh error, user deletion etc.
   */
  private onLogout() {
    localStorage.removeItem(ELocalStorageKey.TOKEN_RESPONSE);
    localStorage.removeItem(ELocalStorageKey.USER);
    // Not awaited: leaving the account must not wait on the cache.
    void clearApiCache();
    this.router.navigate(['/auth']);
  }

  private isExpiredChallenge(error: HttpErrorResponse): boolean {
    const detail = error.error?.detail;
    return (
      error.status === 401 &&
      typeof detail === 'string' &&
      detail.includes('two-factor challenge')
    );
  }
}
