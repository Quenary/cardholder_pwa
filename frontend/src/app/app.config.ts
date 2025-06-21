import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideState, provideStore, Store } from '@ngrx/store';
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
import { provideServiceWorker } from '@angular/service-worker';
import { appReducer } from './state/app.reducers';
import { AppEffects } from './state/app.effects';
import { NetworkService } from './core/services/network.service';
import { UpdateService } from './core/services/update.service';
import { userReducer } from './entities/user/state/user.reducers';
import { UserEffects } from './entities/user/state/user.effects';
import { userInitializer } from './core/app-initializers/user-initializer';
import { localeInitializer } from './core/app-initializers/locale-initializer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideStore(),
    provideState('app', appReducer),
    provideState('auth', authReducer),
    provideState('user', userReducer),
    provideEffects([AppEffects, AuthEffects, UserEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideHttpClient(withInterceptors([getTokenInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: (httpClient: HttpClient) =>
            new TranslateHttpLoader(httpClient, '/i18n/', '.json'),
          deps: [HttpClient],
        },
      })
    ),
    {
      provide: LOCALE_ID,
      useFactory: () => {
        const locale = navigator.language || 'en-US';
        return locale;
      },
    },
    provideAppInitializer(() => translateInitializer()),
    provideAppInitializer(() => localeInitializer()),
    provideAppInitializer(() => authInitializer()),
    provideAppInitializer(() => userInitializer()),
    provideAppInitializer(() => {
      const networkService = inject(NetworkService);
      return networkService.init();
    }),
    provideAppInitializer(() => {
      const updateService = inject(UpdateService);
      return updateService.init();
    }),
    provideAnimationsAsync(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
