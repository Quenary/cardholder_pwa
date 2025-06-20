import { Store } from '@ngrx/store';
import { ELocalStorageKey } from 'src/app/app.consts';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { IUser } from 'src/app/entities/user/user-interface';

export const userInitializer = (store: Store) => {
  const info = localStorage.getItemJson<IUser>(ELocalStorageKey.USER);
  store.dispatch(UserActions.init({ info }));
};
