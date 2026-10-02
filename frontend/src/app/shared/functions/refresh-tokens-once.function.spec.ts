import { ELocalStorageKey } from 'src/app/app.consts';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { refreshTokensOnce } from './refresh-tokens-once.function';

const tokens = (n: number): ITokenResponse => ({
  access_token: `access-${n}`,
  token_type: 'bearer',
  expires_in: 300,
  refresh_token: `refresh-${n}`,
});

const store = (value: ITokenResponse | null) => {
  if (value) {
    localStorage.setItem(
      ELocalStorageKey.TOKEN_RESPONSE,
      JSON.stringify(value),
    );
  } else {
    localStorage.removeItem(ELocalStorageKey.TOKEN_RESPONSE);
  }
};

describe('refreshTokensOnce', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    store(null);
  });

  const withLocks = () => {
    let queue: Promise<unknown> = Promise.resolve();
    const request = vi.fn(
      (_name: string, callback: () => Promise<ITokenResponse>) => {
        const next = queue.then(callback);
        queue = next.catch(() => undefined);
        return next;
      },
    );
    vi.stubGlobal('navigator', { locks: { request } });
    return request;
  };

  describe('with Web Locks', () => {
    it('calls refresh when storage is stale', async () => {
      withLocks();
      store(tokens(1));
      const refresh = vi.fn().mockResolvedValue(tokens(2));

      const result = await refreshTokensOnce('refresh-1', refresh);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(result).toEqual(tokens(2));
    });

    it('reads storage when another tab refreshed', async () => {
      withLocks();
      store(tokens(2));
      const refresh = vi.fn();

      const result = await refreshTokensOnce('refresh-1', refresh);

      expect(refresh).not.toHaveBeenCalled();
      expect(result).toEqual(tokens(2));
    });

    it('coalesces concurrent callers', async () => {
      const request = withLocks();
      store(tokens(1));
      const refresh = vi.fn().mockImplementation(async () => {
        store(tokens(2));
        return tokens(2);
      });

      const [first, second] = await Promise.all([
        refreshTokensOnce('refresh-1', refresh),
        refreshTokensOnce('refresh-1', refresh),
      ]);

      expect(request).toHaveBeenCalledWith(
        'cardholder-token-refresh',
        expect.any(Function),
      );
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(first).toEqual(tokens(2));
      expect(second).toEqual(tokens(2));
    });

    it('propagates refresh errors', async () => {
      withLocks();
      store(tokens(1));
      const error = new Error('401');

      await expect(
        refreshTokensOnce('refresh-1', () => Promise.reject(error)),
      ).rejects.toBe(error);
    });
  });

  describe('without Web Locks', () => {
    it('still calls refresh', async () => {
      vi.stubGlobal('navigator', {});
      store(tokens(1));
      const refresh = vi.fn().mockResolvedValue(tokens(2));

      expect(await refreshTokensOnce('refresh-1', refresh)).toEqual(tokens(2));
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('still reads storage', async () => {
      vi.stubGlobal('navigator', {});
      store(tokens(2));
      const refresh = vi.fn();

      expect(await refreshTokensOnce('refresh-1', refresh)).toEqual(tokens(2));
      expect(refresh).not.toHaveBeenCalled();
    });
  });
});
