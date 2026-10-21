import { appLanguage, appLocale } from './locale-initializer';

describe('appLocale', () => {
  it('keeps a locale the app has data for', () => {
    expect(appLocale('fr-FR')).toBe('fr-FR');
  });

  it('keeps a region the data covers through its language', () => {
    expect(appLocale('de-CH')).toBe('de-CH');
  });

  it('falls back to en-US for a language without data', () => {
    expect(appLocale('pt-BR')).toBe('en-US');
  });

  it('falls back to en-US for an empty locale', () => {
    expect(appLocale('')).toBe('en-US');
  });

  it('keeps dutch, whose data ships for #93', () => {
    expect(appLocale('nl-NL')).toBe('nl-NL');
  });
});

describe('appLanguage', () => {
  it('uses a translated language', () => {
    expect(appLanguage('it-IT')).toBe('it');
  });

  it('ignores the case of the language', () => {
    expect(appLanguage('RU')).toBe('ru');
  });

  it('falls back to english for a language with no file', () => {
    expect(appLanguage('nl-NL')).toBe('en');
  });
});
