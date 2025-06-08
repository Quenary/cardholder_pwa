import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  catchError,
  first,
  of,
  skip,
  switchMap,
  throwError,
  timeout,
} from 'rxjs';
import { IAppState } from 'src/app/app.state';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { selectAuthTokenResponse } from 'src/app/entities/auth/state/auth.selectors';

const ignore = (req: HttpRequest<unknown>): boolean => {
  return req.url.includes('/token');
};

const isRefreshable = (req: HttpRequest<unknown>, error: unknown): boolean => {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 401 &&
    req &&
    !req.url.includes('/token')
  );
};

const cloneWithToken = <T extends unknown = unknown>(
  req: HttpRequest<T>,
  token: string
): HttpRequest<T> => {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
};

let isRefreshing: boolean = false;

export const getTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (ignore(req)) {
    return next(req);
  }

  const store = inject(Store<IAppState>);
  return store.select(selectAuthTokenResponse).pipe(
    first(),
    switchMap((tokens) =>
      next(cloneWithToken(req, tokens.access_token)).pipe(
        catchError((error) => {
          if (isRefreshable(req, error)) {
            if (!isRefreshing) {
              isRefreshing = true;
              store.dispatch(
                AuthActions.refreshToken({
                  refreshToken: tokens.refresh_token,
                })
              );
              store
                .select(selectAuthTokenResponse)
                .pipe(skip(1), first())
                .subscribe({
                  next: () => {
                    isRefreshing = false;
                  },
                });
            }

            return store.select(selectAuthTokenResponse).pipe(
              skip(1),
              first(),
              timeout(10000),
              catchError(() => of(null)),
              switchMap((newTokens) => {
                if (!newTokens) {
                  return throwError(() => error);
                }
                return next(cloneWithToken(req, newTokens.access_token));
              })
            );
          }
          return throwError(() => error);
        })
      )
    )
  );
};
