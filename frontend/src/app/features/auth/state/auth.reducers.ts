import { createReducer, on } from '@ngrx/store';
import { ELocalStorageKey } from 'src/app/app.consts';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from './auth.actions';

export interface IAuthState {
  tokenResponse: ITokenResponse;
}
const cachedTokenResponse = localStorage.getItem(
  ELocalStorageKey.TOKEN_RESPONSE
);
export const initialState: IAuthState = {
  tokenResponse: cachedTokenResponse ? JSON.parse(cachedTokenResponse) : null,
};
export const authReducer = createReducer(
  initialState,
  on(
    AuthActions.tokenSuccess,
    AuthActions.refreshTokenSuccess,
    (state, payload) => ({
      ...state,
      tokenResponse: payload.tokenResponse,
    })
  ),
  on(
    AuthActions.tokenError,
    AuthActions.refreshTokenError,
    AuthActions.logoutError,
    (state, payload) => ({
      ...state,
      tokenResponse: null,
    })
  )
);
