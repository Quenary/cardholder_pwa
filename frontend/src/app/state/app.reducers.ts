import { createReducer, on } from '@ngrx/store';
import { AppActions } from './app.actions';
import { IPublicSettingsItem } from '../entities/public/public-interface';

export const baseActionPrefix: string = '[CARDHOLDER]';
export interface IAppState {
  isOnline: boolean;
  settings: IPublicSettingsItem[];
}
export const initialState: IAppState = {
  isOnline: false,
  settings: [],
};
export const appReducer = createReducer(
  initialState,
  on(AppActions.getPublicSettingsSuccess, (state, payload) => ({
    ...state,
    settings: payload.settings,
  })),
  on(AppActions.getPublicSettingsError, (state, payload) => ({
    ...state,
    settings: [],
  })),
  on(AppActions.networkOnline, (state, payload) => ({
    ...state,
    isOnline: true,
  })),
  on(AppActions.networkOffline, (state, payload) => ({
    ...state,
    isOnline: false,
  })),
);
