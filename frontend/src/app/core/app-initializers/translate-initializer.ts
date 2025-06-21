import { LOCATION_INITIALIZED } from '@angular/common';
import { EnvironmentInjector, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, first, from, of, retry, switchMap } from 'rxjs';

export const translateInitializer = () => {
  const environmentInjector = inject(EnvironmentInjector);
  const translateService = inject(TranslateService);
  const locationInitialized = environmentInjector.get(
    LOCATION_INITIALIZED,
    Promise.resolve(null)
  );
  return from(locationInitialized).pipe(
    switchMap(() => {
      translateService.addLangs(['ru', 'en']);
      translateService.setDefaultLang('en');
      return translateService.use(translateService.getBrowserLang()).pipe(
        first(),
        retry({ count: 1, delay: 100 }),
        catchError(() => of(null))
      );
    })
  );
};
