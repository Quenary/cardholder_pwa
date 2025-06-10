import { createReducer, on } from '@ngrx/store';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from './auth.actions';

export interface IAuthState {
  tokenResponse: ITokenResponse;
  init: boolean;
  isLoading: boolean;
}
export const initialState: IAuthState = {
  tokenResponse: null,
  init: false,
  isLoading: false,
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
    AuthActions.refreshToken,
    AuthActions.logout,
    (state, payload) => ({
      ...state,
      isLoading: true,
    })
  ),
  on(
    AuthActions.tokenSuccess,
    AuthActions.refreshTokenSuccess,
    (state, payload) => ({
      ...state,
      tokenResponse: payload.tokenResponse,
      isLoading: false,
    })
  ),
  on(
    AuthActions.logoutSuccess,
    AuthActions.tokenError,
    AuthActions.refreshTokenError,
    AuthActions.logoutError,
    (state, payload) => ({
      ...state,
      tokenResponse: null,
      isLoading: false,
    })
  ),
  on(AuthActions.logoutSilent, (state, payload) => ({
    ...initialState,
    init: true,
  }))
);
