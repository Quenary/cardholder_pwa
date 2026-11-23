import { createReducer, on } from '@ngrx/store';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from './auth.actions';

export interface ITwoFactorChallengeState {
  token: string;
  expiresAt: number;
}
export interface IAuthState {
  tokenResponse: ITokenResponse;
  init: boolean;
  isLoading: boolean;
  /**
   * Login step 2. Kept in memory only: a refresh should send the user
   * back to the password form rather than a half-finished challenge.
   */
  twoFactorChallenge: ITwoFactorChallengeState | null;
}
export const initialState: IAuthState = {
  tokenResponse: null,
  init: false,
  isLoading: false,
  twoFactorChallenge: null,
};
export const authReducer = createReducer(
  initialState,
  on(AuthActions.init, (state, payload) => ({
    ...state,
    tokenResponse: payload.tokenResponse,
    init: true,
  })),
  on(
    AuthActions.token,
    AuthActions.tokenTwoFactor,
    AuthActions.refreshToken,
    AuthActions.logout,
    (state) => ({
      ...state,
      isLoading: true,
    }),
  ),
  on(AuthActions.tokenTwoFactorRequired, (state, { challenge }) => ({
    ...state,
    isLoading: false,
    twoFactorChallenge: {
      token: challenge.challenge_token,
      expiresAt: Date.now() + challenge.expires_in * 1000,
    },
  })),
  on(
    AuthActions.tokenSuccess,
    AuthActions.refreshTokenSuccess,
    (state, payload) => ({
      ...state,
      tokenResponse: payload.tokenResponse,
      twoFactorChallenge: null,
      isLoading: false,
    }),
  ),
  on(AuthActions.tokenTwoFactorCancel, (state) => ({
    ...state,
    twoFactorChallenge: null,
    isLoading: false,
  })),
  on(AuthActions.tokenTwoFactorError, (state) => ({
    ...state,
    isLoading: false,
  })),
  on(AuthActions.tokensReplaced, (state, { tokenResponse }) => ({
    ...state,
    tokenResponse,
  })),
  on(
    AuthActions.logoutSuccess,
    AuthActions.tokenError,
    AuthActions.refreshTokenError,
    AuthActions.logoutError,
    (state) => ({
      ...state,
      tokenResponse: null,
      isLoading: false,
    }),
  ),
  on(AuthActions.tokensSynced, (state, payload) => ({
    ...state,
    tokenResponse: payload.tokenResponse,
  })),
  on(AuthActions.logoutSilent, () => ({
    ...initialState,
    init: true,
  })),
);
