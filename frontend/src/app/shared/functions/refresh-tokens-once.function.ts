import { ELocalStorageKey } from 'src/app/app.consts';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';

export const TOKEN_REFRESH_LOCK = 'cardholder-token-refresh';

/**
 * Refreshes the tokens without two tabs spending the same refresh token.
 *
 * The backend rotates the refresh token, so only the first of two requests
 * carrying the same one succeeds. The tokens live in localStorage, shared by
 * every tab, so the refresh runs under a Web Lock: the tab that gets it
 * first asks the backend, and the others, once they hold the lock, find the
 * new tokens in storage and use them instead of asking again.
 *
 * Where `navigator.locks` is missing (it needs a secure context, so plain
 * http installs do not have it) the refresh runs unguarded, after the same
 * look at storage.
 *
 * @param staleRefreshToken the refresh token the caller wants to replace
 * @param refresh asks the backend for new tokens
 */
export const refreshTokensOnce = (
  staleRefreshToken: string,
  refresh: () => Promise<ITokenResponse>,
): Promise<ITokenResponse> => {
  const run = async (): Promise<ITokenResponse> => {
    const stored = localStorage.getItemJson<ITokenResponse>(
      ELocalStorageKey.TOKEN_RESPONSE,
    );
    if (stored && stored.refresh_token !== staleRefreshToken) {
      return stored;
    }
    return refresh();
  };

  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(TOKEN_REFRESH_LOCK, run);
  }
  return run();
};
