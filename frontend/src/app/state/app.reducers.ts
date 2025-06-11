import { createReducer, on } from '@ngrx/store';
import { AppActions } from './app.actions';

export const baseActionPrefix: string = '[CARDHOLDER]';
export interface IAppState {
  isOnline: boolean;
}
export const initialState: IAppState = {
  isOnline: false,
};
export const appReducer = createReducer(
  initialState,
  on(AppActions.networkOnline, (state, payload) => ({
    ...state,
    isOnline: true,
  })),
  on(AppActions.networkOffline, (state, payload) => ({
    ...state,
    isOnline: false,
  }))
);
