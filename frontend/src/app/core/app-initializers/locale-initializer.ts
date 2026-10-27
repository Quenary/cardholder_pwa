import { LOCATION_INITIALIZED, registerLocaleData } from '@angular/common';
import { inject, EnvironmentInjector } from '@angular/core';
import { from, switchMap, first, catchError, of, tap } from 'rxjs';

/** Angular locale data the app ships, by language. */
const LOCALE_DATA: Record<string, () => Promise<{ default: unknown }>> = {
  de: () => import('@angular/common/locales/de'),
  en: () => import('@angular/common/locales/en'),
  es: () => import('@angular/common/locales/es'),
  fr: () => import('@angular/common/locales/fr'),
  it: () => import('@angular/common/locales/it'),
  ja: () => import('@angular/common/locales/ja'),
  nl: () => import('@angular/common/locales/nl'),
  ru: () => import('@angular/common/locales/ru'),
  zh: () => import('@angular/common/locales/zh'),
};

/** Languages with a file in public/i18n. */
export const TRANSLATED_LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'ru'];

const languageOf = (locale: string | undefined): string =>
  (locale ?? '').split('-')[0].toLowerCase();

/**
 * The locale for LOCALE_ID: the browser's, when the app has data for its
 * language, else en-US. A locale without data makes DatePipe and the other
 * locale-aware pipes throw (NG0701), which blanks whatever template uses them.
 */
export const appLocale = (locale = navigator.language): string =>
  languageOf(locale) in LOCALE_DATA ? locale : 'en-US';

/** The browser's language when it is translated, else English. */
export const appLanguage = (locale = navigator.language): string => {
  const language = languageOf(locale);
  return TRANSLATED_LANGUAGES.includes(language) ? language : 'en';
};

export const localeInitializer = () => {
  const environmentInjector = inject(EnvironmentInjector);
  const locationInitialized = environmentInjector.get(
    LOCATION_INITIALIZED,
    Promise.resolve(null),
  );
  return from(locationInitialized).pipe(
    switchMap(() => {
      const load = LOCALE_DATA[languageOf(appLocale())];
      return from(load().then((c) => c.default)).pipe(
        tap((data) => {
          registerLocaleData(data);
        }),
        first(),
        catchError(() => of(null)),
      );
    }),
  );
};
