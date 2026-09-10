// Suffixed because an import called `it` would shadow the test function.
import deJson from '../../public/i18n/de.json';
import enJson from '../../public/i18n/en.json';
import esJson from '../../public/i18n/es.json';
import frJson from '../../public/i18n/fr.json';
import itJson from '../../public/i18n/it.json';
import ruJson from '../../public/i18n/ru.json';

/**
 * Every locale carries the same keys as English.
 *
 * The card sharing feature shipped with English and Russian only, and the
 * gap went unnoticed because a missing key falls back to English at runtime,
 * so nothing looks broken. This makes it fail instead.
 *
 * A new locale goes in the map below as well as in public/i18n.
 */
const translations: Record<string, unknown> = {
  de: deJson,
  es: esJson,
  fr: frJson,
  it: itJson,
  ru: ruJson,
};

type Tree = Record<string, unknown>;

/** Dotted paths. An array becomes one entry holding its length. */
const flatten = (node: Tree, prefix = ''): Map<string, unknown> => {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(node)) {
    const path = `${prefix}${key}`;
    if (Array.isArray(value)) {
      out.set(path, value.length);
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of flatten(value as Tree, `${path}.`)) {
        out.set(k, v);
      }
    } else {
      out.set(path, value);
    }
  }
  return out;
};

const english = flatten(enJson as Tree);

describe('translations', () => {
  for (const [locale, tree] of Object.entries(translations)) {
    describe(locale, () => {
      const translated = flatten(tree as Tree);

      it('has no missing key', () => {
        const missing = [...english.keys()].filter((k) => !translated.has(k));
        expect(missing).toEqual([]);
      });

      it('has no key english does not have', () => {
        const extra = [...translated.keys()].filter((k) => !english.has(k));
        expect(extra).toEqual([]);
      });

      it('keeps the arrays the same length', () => {
        const wrong = [...english.entries()]
          .filter(([k, v]) => typeof v === 'number' && translated.get(k) !== v)
          .map(([k]) => k);
        expect(wrong).toEqual([]);
      });

      it('has nothing left blank', () => {
        const blank = [...translated.entries()]
          .filter(([, v]) => typeof v === 'string' && v.trim() === '')
          .map(([k]) => k);
        expect(blank).toEqual([]);
      });
    });
  }
});
