import { createReducer, on } from '@ngrx/store';
import { IUser, IUserUpdate } from '../user-interface';
import { UserActions } from './user.actions';

export interface IUserState {
  info: IUser;
  form: IUserUpdate;
  hasChanges: boolean;
  isLoading: boolean;
}
export const initialState: IUserState = {
  info: null,
  form: null,
  hasChanges: false,
  isLoading: false,
};
export const userReducer = createReducer(
  initialState,
  on(
    UserActions.read,
    UserActions.update,
    UserActions.delete,
    (state, payload) => ({
      ...state,
      isLoading: true,
    })
  ),
  on(UserActions.updateSuccess, UserActions.readSuccess, (state, payload) => ({
    ...state,
    info: payload.info,
    hasChanges: false,
    isLoading: false,
  })),
  on(UserActions.deleteSuccess, (state, payload) => ({
    ...state,
    ...initialState,
  })),
  on(
    UserActions.readError,
    UserActions.updateError,
    UserActions.deleteError,
    (state, payload) => ({
      ...state,
      isLoading: false,
    })
  ),
  on(UserActions.setForm, (state, payload) => {
    const info = state.info ?? { username: null, email: null };
    const form = payload.form;
    const hasChanges =
      form.username !== info.username ||
      form.email !== info.email ||
      !!form.password;
    return {
      ...state,
      form,
      hasChanges,
    };
  })
);
