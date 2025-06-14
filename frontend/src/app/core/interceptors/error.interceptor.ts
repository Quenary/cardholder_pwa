import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';

const ignoreCodes = [401];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const translateService = inject(TranslateService);
  const matSnackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!ignoreCodes.includes(error.status)) {
        matSnackBar.open(
          `${translateService.instant('GENERAL.REQUEST_ERROR')} ${
            error.message
          }`,
          translateService.instant('GENERAL.CLOSE'),
          { duration: 10000 }
        );
      }
      return throwError(() => error);
    })
  );
};
