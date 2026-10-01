import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject, Subscription } from 'rxjs';
import { ELocalStorageKey } from 'src/app/app.consts';
import { SnackService } from 'src/app/core/services/snack.service';
import { AuthApiService } from 'src/app/entities/auth/auth-api.service';
import { testAppState } from 'src/testing';
import { AuthActions } from './auth.actions';
import { AuthEffects } from './auth.effects';

const NEW_TOKENS = {
  access_token: 'new-access-token',
  token_type: 'bearer',
  expires_in: 899,
  refresh_token: 'new-refresh-token',
};

const storageEvent = (init: StorageEventInit) =>
  window.dispatchEvent(
    new StorageEvent('storage', { storageArea: localStorage, ...init }),
  );

describe('AuthEffects', () => {
  let effects: AuthEffects;
  let emitted: Action[];
  let subscription: Subscription;

  afterEach(() => subscription?.unsubscribe());

  const setup = (tokenResponse = testAppState.auth.tokenResponse) => {
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => new Subject<Action>()),
        provideMockStore({
          initialState: {
            ...testAppState,
            auth: { ...testAppState.auth, tokenResponse },
          },
        }),
        { provide: AuthApiService, useValue: {} },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: SnackService, useValue: { error: vi.fn() } },
      ],
    });
    effects = TestBed.inject(AuthEffects);
    emitted = [];
    const actions = emitted;
    subscription = effects.syncTokens$.subscribe((action) =>
      actions.push(action),
    );
  };

  describe('syncTokens$', () => {
    it('takes the tokens another tab stored', () => {
      setup();

      storageEvent({
        key: ELocalStorageKey.TOKEN_RESPONSE,
        newValue: JSON.stringify(NEW_TOKENS),
      });

      expect(emitted).toEqual([
        AuthActions.tokensSynced({ tokenResponse: NEW_TOKENS }),
      ]);
    });

    it('does not follow another tab to a logout', () => {
      setup();

      storageEvent({ key: ELocalStorageKey.TOKEN_RESPONSE, newValue: null });

      expect(emitted).toEqual([]);
    });

    it('ignores other keys', () => {
      setup();

      storageEvent({
        key: ELocalStorageKey.USER,
        newValue: JSON.stringify(NEW_TOKENS),
      });

      expect(emitted).toEqual([]);
    });

    it('ignores a value that is not tokens', () => {
      setup();

      storageEvent({ key: ELocalStorageKey.TOKEN_RESPONSE, newValue: '{oops' });
      storageEvent({ key: ELocalStorageKey.TOKEN_RESPONSE, newValue: '{}' });

      expect(emitted).toEqual([]);
    });

    it('leaves a tab that is not logged in alone', () => {
      setup(null);

      storageEvent({
        key: ELocalStorageKey.TOKEN_RESPONSE,
        newValue: JSON.stringify(NEW_TOKENS),
      });

      expect(emitted).toEqual([]);
    });
  });
});
