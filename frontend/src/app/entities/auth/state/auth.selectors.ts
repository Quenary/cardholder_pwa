import { createFeatureSelector, createSelector } from '@ngrx/store';
import { IAuthState } from './auth.reducers';

const _selectAuth = createFeatureSelector<IAuthState>('auth');
export const selectAuth = createSelector(_selectAuth, (state) => state);
export const selectAuthIsLoading = createSelector(
  _selectAuth,
  (state) => state.isLoading
);
export const selectAuthTokenResponse = createSelector(
  _selectAuth,
  (state) => state.tokenResponse
);
