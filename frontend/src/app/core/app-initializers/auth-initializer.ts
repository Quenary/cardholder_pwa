import { Store } from '@ngrx/store';
import { first } from 'rxjs';
import { ELocalStorageKey } from 'src/app/app.consts';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { selectAuth } from 'src/app/entities/auth/state/auth.selectors';

export const authInitializer = (store: Store) => {
  const tokenResponse = localStorage.getItemJson<ITokenResponse>(
    ELocalStorageKey.TOKEN_RESPONSE
  );
  store.dispatch(AuthActions.init({ tokenResponse }));
  return store.select(selectAuth).pipe(first((res) => res.init));
};
