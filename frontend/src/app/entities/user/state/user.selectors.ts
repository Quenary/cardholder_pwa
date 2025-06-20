import { createFeatureSelector, createSelector } from '@ngrx/store';
import { IUserState } from './user.reducers';
import { EUserRole } from '../user-interface';

const _selectUser = createFeatureSelector<IUserState>('user');
export const selectUserIsLoading = createSelector(
  _selectUser,
  (state) => state.isLoading
);
export const selectUserHasChanges = createSelector(
  _selectUser,
  (state) => state.hasChanges
);
export const selectUserInfo = createSelector(
  _selectUser,
  (state) => state.info
);
export const selectUserIsAdmin = createSelector(selectUserInfo, (info) =>
  [EUserRole.OWNER, EUserRole.ADMIN].includes(info?.role_code)
);
