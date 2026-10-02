import { clearApiCache } from './clear-api-cache.function';

const NAMES = [
  'ngsw:/:1:data:dynamic:api:cache',
  'ngsw:/:1:data:dynamic:card-logos:cache',
  'ngsw:/:42:assets:app:cache',
  'ngsw:/:db:control',
  'some-other-cache',
];

describe('clearApiCache', () => {
  let deleted: string[];

  beforeEach(() => {
    deleted = [];
    vi.stubGlobal('caches', {
      keys: () => Promise.resolve(NAMES),
      delete: (name: string) => {
        deleted.push(name);
        return Promise.resolve(true);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('cache selection', () => {
    it('drops api caches', async () => {
      await clearApiCache();

      expect(deleted).toEqual([
        'ngsw:/:1:data:dynamic:api:cache',
        'ngsw:/:1:data:dynamic:card-logos:cache',
      ]);
    });

    it('keeps asset caches', async () => {
      await clearApiCache();

      expect(deleted).not.toContain('ngsw:/:42:assets:app:cache');
      expect(deleted).not.toContain('ngsw:/:db:control');
      expect(deleted).not.toContain('some-other-cache');
    });
  });

  describe('errors', () => {
    it('does not throw when caches.keys fails', async () => {
      vi.stubGlobal('caches', {
        keys: () => Promise.reject(new Error('denied')),
        delete: () => Promise.resolve(true),
      });

      await expect(clearApiCache()).resolves.toBeUndefined();
    });
  });
});
