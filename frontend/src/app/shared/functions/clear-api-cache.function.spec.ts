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

  it('drops the api caches', async () => {
    await clearApiCache();

    expect(deleted).toEqual([
      'ngsw:/:1:data:dynamic:api:cache',
      'ngsw:/:1:data:dynamic:card-logos:cache',
    ]);
  });

  it('keeps the assets so the app still opens offline', async () => {
    await clearApiCache();

    expect(deleted).not.toContain('ngsw:/:42:assets:app:cache');
    expect(deleted).not.toContain('ngsw:/:db:control');
    expect(deleted).not.toContain('some-other-cache');
  });

  it('does not throw when the cache api refuses', async () => {
    vi.stubGlobal('caches', {
      keys: () => Promise.reject(new Error('denied')),
      delete: () => Promise.resolve(true),
    });

    await expect(clearApiCache()).resolves.toBeUndefined();
  });
});
