import { createReducer, on } from '@ngrx/store';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from './auth.actions';

export interface IAuthState {
  tokenResponse: ITokenResponse;
  init: boolean;
}
export const initialState: IAuthState = {
  tokenResponse: null,
  init: false,
};
export const authReducer = createReducer(
  initialState,
  on(AuthActions.init, (state, payload) => ({
    ...state,
    tokenResponse: payload.tokenResponse,
    init: true,
  })),
  on(
    AuthActions.tokenSuccess,
    AuthActions.refreshTokenSuccess,
    (state, payload) => ({
      ...state,
      tokenResponse: payload.tokenResponse,
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
    })
  )
);
