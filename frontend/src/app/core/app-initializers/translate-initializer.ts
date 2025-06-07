import { LOCATION_INITIALIZED } from '@angular/common';
import { EnvironmentInjector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

export const translateInitializer = (
  environmentInjector: EnvironmentInjector
) => {
  return new Promise<any>((resolve: any) => {
    const locationInitialized = environmentInjector.get(
      LOCATION_INITIALIZED,
      Promise.resolve(null)
    );
    const translateService = environmentInjector.get(TranslateService);
    locationInitialized.then(() => {
      translateService.addLangs(['ru', 'en']);
      translateService.setDefaultLang('en');
      translateService
        .use(translateService.getBrowserLang())
        .pipe(finalize(() => resolve(null)))
        .subscribe();
    });
  });
};
