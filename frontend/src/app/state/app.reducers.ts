import { createReducer, on } from '@ngrx/store';
import { AppActions } from './app.actions';
import {
  IPublicSettingsItem,
  IVersion,
} from '../entities/public/public-interface';

export const baseActionPrefix = '[CARDHOLDER]';
export interface IAppState {
  /**
   * Connection state
   */
  isOnline: boolean;
  /**
   * Public app settings from api
   */
  settings: IPublicSettingsItem[];
  /**
   * Current version
   */
  version: IVersion;
}
export const initialState: IAppState = {
  isOnline: false,
  settings: [],
  version: null,
};
export const appReducer = createReducer(
  initialState,
  on(AppActions.getPublicSettingsSuccess, (state, payload) => ({
    ...state,
    settings: payload.settings,
  })),
  on(AppActions.getPublicSettingsError, (state) => ({
    ...state,
    settings: [],
  })),
  on(AppActions.getVersionSuccess, (state, payload) => ({
    ...state,
    version: payload.version,
  })),
  on(AppActions.getVersionError, (state) => ({
    ...state,
    version: null,
  })),
  on(AppActions.setNetworkStatus, (state, { isOnline }) => ({
    ...state,
    isOnline,
  })),
);
