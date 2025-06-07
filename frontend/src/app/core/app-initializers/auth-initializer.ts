import { Store } from '@ngrx/store';
import { filter, first, firstValueFrom } from 'rxjs';
import { ELocalStorageKey } from 'src/app/app.consts';
import { IAppState } from 'src/app/app.state';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { selectAuth } from 'src/app/entities/auth/state/auth.selectors';

export const authInitializer = (store: Store<IAppState>) => {
  const tokenResponse = localStorage.getItemJson<ITokenResponse>(
    ELocalStorageKey.TOKEN_RESPONSE
  );
  store.dispatch(AuthActions.init({ tokenResponse }));
  return store.select(selectAuth).pipe(
    filter((res) => res.init),
    first()
  );
};
