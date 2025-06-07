import { createSelector } from '@ngrx/store';
import { IAppState } from 'src/app/app.state';

const _selectAuth = (state: IAppState) => state.auth;
export const selectAuth = createSelector(_selectAuth, (state) => state);
export const selectAuthTokenResponse = createSelector(
  _selectAuth,
  (state) => state.tokenResponse
);
