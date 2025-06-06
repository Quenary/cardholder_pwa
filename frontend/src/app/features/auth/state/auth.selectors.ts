import { createFeatureSelector, createSelector } from '@ngrx/store';
import { IAuthState } from './auth.reducers';

const _selectAuth = createFeatureSelector<IAuthState>('auth');
export const selectAuthTokenResponse = createSelector(
  _selectAuth,
  (state) => state.tokenResponse
);
