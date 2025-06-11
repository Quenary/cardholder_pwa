import { createSelector } from '@ngrx/store';
import { IAppState } from './app.reducers';

const _selectApp = (state) => state.app as IAppState;
export const selectAppIsOnline = createSelector(
  _selectApp,
  (state) => state.isOnline
);
export const selectAppIsOffline = createSelector(
  _selectApp,
  (state) => !state.isOnline
);
