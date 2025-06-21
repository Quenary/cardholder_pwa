import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { first } from 'rxjs';
import { ELocalStorageKey } from 'src/app/app.consts';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { selectUser } from 'src/app/entities/user/state/user.selectors';
import { IUser } from 'src/app/entities/user/user-interface';

export const userInitializer = () => {
  const store = inject(Store);
  const info = localStorage.getItemJson<IUser>(ELocalStorageKey.USER);
  store.dispatch(UserActions.init({ info }));
  return store.select(selectUser).pipe(first((res) => res.init));
};
