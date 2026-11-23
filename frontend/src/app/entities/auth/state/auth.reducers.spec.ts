import { HttpErrorResponse } from '@angular/common/http';
import { Action } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { authReducer, IAuthState, initialState } from './auth.reducers';

const TOKENS = {
  access_token: 'access',
  token_type: 'bearer',
  expires_in: 300,
  refresh_token: 'refresh',
};

describe('authReducer', () => {
  describe('twoFactorChallenge', () => {
    it('stores the challenge outside of storage', () => {
      const state = authReducer(
        initialState,
        AuthActions.tokenTwoFactorRequired({
          challenge: {
            two_factor_required: true,
            challenge_token: 'challenge',
            expires_in: 300,
          },
        }),
      );

      expect(state.twoFactorChallenge?.token).toBe('challenge');
      expect(state.twoFactorChallenge?.expiresAt).toBeGreaterThan(Date.now());
      expect(state.isLoading).toBe(false);
    });

    it('clears the challenge when login succeeds', () => {
      const pending = authReducer(
        initialState,
        AuthActions.tokenTwoFactorRequired({
          challenge: {
            two_factor_required: true,
            challenge_token: 'challenge',
            expires_in: 300,
          },
        }),
      );

      const state = authReducer(
        pending,
        AuthActions.tokenSuccess({ tokenResponse: TOKENS }),
      );

      expect(state.twoFactorChallenge).toBeNull();
      expect(state.tokenResponse).toEqual(TOKENS);
    });

    it('clears the challenge when the user goes back', () => {
      const pending = authReducer(
        {
          ...initialState,
          twoFactorChallenge: { token: 'challenge', expiresAt: 1 },
          isLoading: true,
        },
        AuthActions.tokenTwoFactorCancel(),
      );

      expect(pending.twoFactorChallenge).toBeNull();
      expect(pending.isLoading).toBe(false);
    });
  });

  describe('tokensReplaced', () => {
    it('replaces the stored pair', () => {
      const state = authReducer(
        initialState,
        AuthActions.tokensReplaced({ tokenResponse: TOKENS }),
      );

      expect(state.tokenResponse).toEqual(TOKENS);
    });
  });

  describe('init', () => {
    it('stores the pair from storage', () => {
      const state = authReducer(
        initialState,
        AuthActions.init({ tokenResponse: TOKENS }),
      );

      expect(state.tokenResponse).toEqual(TOKENS);
      expect(state.init).toBe(true);
    });
  });

  describe('isLoading', () => {
    const password = AuthActions.token({
      body: { grant_type: 'password', username: 'a', password: 'b' },
    });

    it.each([
      ['token', password],
      ['tokenTwoFactor', AuthActions.tokenTwoFactor({ code: '123456' })],
      ['refreshToken', AuthActions.refreshToken({ refreshToken: 'r' })],
      ['logout', AuthActions.logout()],
    ])('%s starts a request', (_name, action) => {
      expect(authReducer(initialState, action).isLoading).toBe(true);
    });
  });

  describe('tokenTwoFactorError', () => {
    it('stops loading and keeps the challenge', () => {
      const pending: IAuthState = {
        ...initialState,
        isLoading: true,
        twoFactorChallenge: { token: 'challenge', expiresAt: 1 },
      };

      const state = authReducer(
        pending,
        AuthActions.tokenTwoFactorError({
          error: new HttpErrorResponse({ status: 401 }),
        }),
      );

      expect(state.isLoading).toBe(false);
      expect(state.twoFactorChallenge).toEqual(pending.twoFactorChallenge);
    });
  });

  describe('session end', () => {
    const signedIn: IAuthState = {
      ...initialState,
      tokenResponse: TOKENS,
      isLoading: true,
      init: true,
    };
    const error = new HttpErrorResponse({ status: 401 });

    it.each<[string, Action]>([
      ['logoutSuccess', AuthActions.logoutSuccess()],
      ['tokenError', AuthActions.tokenError({ error })],
      ['refreshTokenError', AuthActions.refreshTokenError({ error })],
      ['logoutError', AuthActions.logoutError({ error })],
    ])('%s drops the pair', (_name, action) => {
      const state = authReducer(signedIn, action);

      expect(state.tokenResponse).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('drops everything except init on a silent logout', () => {
      const state = authReducer(
        {
          ...signedIn,
          twoFactorChallenge: { token: 'challenge', expiresAt: 1 },
        },
        AuthActions.logoutSilent(),
      );

      expect(state).toEqual({ ...initialState, init: true });
    });
  });

  describe('tokensSynced', () => {
    it('replaces the pair and leaves the request flag alone', () => {
      const state = authReducer(
        { ...initialState, isLoading: true },
        AuthActions.tokensSynced({ tokenResponse: TOKENS }),
      );

      expect(state.tokenResponse).toEqual(TOKENS);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('refreshTokenSuccess', () => {
    it('stores the pair and clears a challenge', () => {
      const state = authReducer(
        {
          ...initialState,
          isLoading: true,
          twoFactorChallenge: { token: 'challenge', expiresAt: 1 },
        },
        AuthActions.refreshTokenSuccess({ tokenResponse: TOKENS }),
      );

      expect(state.tokenResponse).toEqual(TOKENS);
      expect(state.twoFactorChallenge).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });
});
