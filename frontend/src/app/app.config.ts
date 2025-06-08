import {
  ApplicationConfig,
  EnvironmentInjector,
  importProvidersFrom,
  inject,
  isDevMode,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authReducer } from './entities/auth/state/auth.reducers';
import { AuthEffects } from './entities/auth/state/auth.effects';
import { translateInitializer } from './core/app-initializers/translate-initializer';
import { authInitializer } from './core/app-initializers/auth-initializer';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { getTokenInterceptor } from './core/interceptors/token.interceptor';

function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, '/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideStore({ auth: authReducer }),
    provideEffects([AuthEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideHttpClient(withInterceptors([getTokenInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      })
    ),
    provideAppInitializer(() =>
      translateInitializer(inject(EnvironmentInjector))
    ),
    provideAppInitializer(() => authInitializer(inject(Store))),
    provideAnimationsAsync(),
  ],
};
