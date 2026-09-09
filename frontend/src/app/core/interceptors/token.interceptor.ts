import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  catchError,
  filter,
  finalize,
  first,
  Observable,
  of,
  shareReplay,
  switchMap,
  throwError,
  timeout,
} from 'rxjs';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import {
  selectAuth,
  selectAuthTokenResponse,
} from 'src/app/entities/auth/state/auth.selectors';

const ignoreList = ['/token'];

const REFRESH_TIMEOUT_MS = 10000;

const ignore = (req: HttpRequest<unknown>): boolean => {
  return ignoreList.some((item) => req.url.includes(item));
};

const isRefreshable = (req: HttpRequest<unknown>, error: unknown): boolean => {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 401 &&
    req &&
    !ignore(req)
  );
};

const cloneWithToken = <T = unknown>(
  req: HttpRequest<T>,
  token: string,
): HttpRequest<T> => {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * The refresh currently in flight, shared by every request that hit a 401
 * while it was running. Cleared once it settles, so the next 401 starts a
 * new one.
 */
let refresh$: Observable<ITokenResponse | null> | null = null;

/**
 * Ask for a new token, or join the request already asking for one.
 *
 * Waiting on a token that is no longer `staleToken` rather than on the next
 * emission means the order between the dispatch and the subscription does
 * not matter: a caller arriving late reads the value that is already there
 * instead of waiting for one that will not come.
 *
 * Resolves to null when the refresh fails, since the reducer clears the
 * token response on `refresh token error`.
 */
const refreshOnce = (
  store: Store,
  staleToken: string,
  refreshToken: string,
): Observable<ITokenResponse | null> => {
  if (!refresh$) {
    refresh$ = store.select(selectAuthTokenResponse).pipe(
      filter((tokens) => !tokens || tokens.access_token !== staleToken),
      first(),
      timeout(REFRESH_TIMEOUT_MS),
      catchError(() => of(null)),
      finalize(() => {
        refresh$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    store.dispatch(AuthActions.refreshToken({ refreshToken }));
  }
  return refresh$;
};

export const getTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (ignore(req)) {
    return next(req);
  }

  const store = inject(Store);
  return store.select(selectAuth).pipe(
    first((auth) => auth.init),
    switchMap((auth) => {
      const tokens = auth.tokenResponse;
      if (!tokens) {
        return next(req);
      }
      const usedToken = tokens.access_token;

      return next(cloneWithToken(req, usedToken)).pipe(
        catchError((error) => {
          if (!isRefreshable(req, error)) {
            return throwError(() => error);
          }

          return store.select(selectAuthTokenResponse).pipe(
            first(),
            switchMap((current) => {
              // Another request refreshed while this one was in flight. The
              // token to retry with is already here, so asking for another
              // one would spend a refresh token that has just been rotated.
              if (current && current.access_token !== usedToken) {
                return next(cloneWithToken(req, current.access_token));
              }

              return refreshOnce(store, usedToken, tokens.refresh_token).pipe(
                switchMap((fresh) =>
                  fresh
                    ? next(cloneWithToken(req, fresh.access_token))
                    : throwError(() => error),
                ),
              );
            }),
          );
        }),
      );
    }),
  );
};
