import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action, Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { ELocalStorageKey } from 'src/app/app.consts';
import { SnackService } from 'src/app/core/services/snack.service';
import { AuthApiService } from 'src/app/entities/auth/auth-api.service';
import { testAppState } from 'src/testing';
import { UserActions } from '../../user/state/user.actions';
import { AuthActions } from './auth.actions';
import { AuthEffects } from './auth.effects';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

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
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key },
        },
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
    it('syncs tokens from another tab', () => {
      setup();

      storageEvent({
        key: ELocalStorageKey.TOKEN_RESPONSE,
        newValue: JSON.stringify(NEW_TOKENS),
      });

      expect(emitted).toEqual([
        AuthActions.tokensSynced({ tokenResponse: NEW_TOKENS }),
      ]);
    });

    it('ignores logout in another tab', () => {
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

    it('ignores invalid token payloads', () => {
      setup();

      storageEvent({ key: ELocalStorageKey.TOKEN_RESPONSE, newValue: '{oops' });
      storageEvent({ key: ELocalStorageKey.TOKEN_RESPONSE, newValue: '{}' });

      expect(emitted).toEqual([]);
    });

    it('ignores sync when this tab is logged out', () => {
      setup(null);

      storageEvent({
        key: ELocalStorageKey.TOKEN_RESPONSE,
        newValue: JSON.stringify(NEW_TOKENS),
      });

      expect(emitted).toEqual([]);
    });
  });
});

const CHALLENGE = {
  two_factor_required: true as const,
  challenge_token: 'challenge-token',
  expires_in: 300,
};

const httpError = (status: number, detail: string) =>
  new HttpErrorResponse({
    status,
    statusText: 'error',
    error: { detail },
  });

describe('AuthEffects login', () => {
  let actions$: Subject<Action>;
  let effects: AuthEffects;
  let token: ReturnType<typeof vi.fn>;
  let tokenTwoFactor: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let snackError: ReturnType<typeof vi.fn>;

  const setup = (challenge: { token: string; expiresAt: number } | null) => {
    actions$ = new Subject<Action>();
    token = vi.fn();
    tokenTwoFactor = vi.fn();
    navigate = vi.fn();
    snackError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            ...testAppState,
            auth: { ...testAppState.auth, twoFactorChallenge: challenge },
          },
        }),
        {
          provide: AuthApiService,
          useValue: { token, tokenTwoFactor },
        },
        { provide: Router, useValue: { navigate } },
        { provide: SnackService, useValue: { error: snackError } },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key },
        },
      ],
    });
    effects = TestBed.inject(AuthEffects);
  };

  afterEach(() => TestBed.resetTestingModule());

  describe('token$', () => {
    it('keeps the user on the form when a challenge comes back', () => {
      setup(null);
      token.mockReturnValue(of(CHALLENGE));
      const emitted: Action[] = [];
      effects.token$.subscribe((action) => emitted.push(action));
      effects.navigateAfterLogin$.subscribe();

      actions$.next(
        AuthActions.token({
          body: { grant_type: 'password', username: 'a', password: 'b' },
        }),
      );

      expect(emitted).toEqual([
        AuthActions.tokenTwoFactorRequired({ challenge: CHALLENGE }),
      ]);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('navigates once tokens are issued', () => {
      setup(null);
      token.mockReturnValue(of(NEW_TOKENS));
      const emitted: Action[] = [];
      effects.token$.subscribe((action) => {
        emitted.push(action);
        actions$.next(action);
      });
      effects.navigateAfterLogin$.subscribe();

      actions$.next(
        AuthActions.token({
          body: { grant_type: 'password', username: 'a', password: 'b' },
        }),
      );

      expect(emitted).toEqual([
        AuthActions.tokenSuccess({ tokenResponse: NEW_TOKENS }),
      ]);
      expect(navigate).toHaveBeenCalledWith(['/cards']);
    });
  });

  describe('tokenTwoFactor$', () => {
    const challenge = {
      token: 'challenge-token',
      expiresAt: Date.now() + 1000,
    };

    const submit = () => {
      const emitted: Action[] = [];
      effects.tokenTwoFactor$.subscribe((action) => {
        emitted.push(action);
        actions$.next(action);
      });
      effects.navigateAfterLogin$.subscribe();
      actions$.next(AuthActions.tokenTwoFactor({ code: '123456' }));
      return emitted;
    };

    it('navigates when the code is accepted', () => {
      setup(challenge);
      tokenTwoFactor.mockReturnValue(of(NEW_TOKENS));

      expect(submit()).toEqual([
        AuthActions.tokenSuccess({ tokenResponse: NEW_TOKENS }),
      ]);
      expect(navigate).toHaveBeenCalledWith(['/cards']);
    });

    it('clears the step when the challenge is expired', () => {
      setup(challenge);
      tokenTwoFactor.mockReturnValue(
        throwError(() =>
          httpError(401, 'Invalid or expired two-factor challenge'),
        ),
      );

      expect(submit()).toEqual([AuthActions.tokenTwoFactorCancel()]);
      expect(snackError).toHaveBeenCalledWith('AUTH.TWO_FACTOR.EXPIRED');
    });

    it('keeps the step when the code is wrong', () => {
      setup(challenge);
      const error = httpError(401, 'Invalid two-factor code');
      tokenTwoFactor.mockReturnValue(throwError(() => error));

      expect(submit()).toEqual([AuthActions.tokenTwoFactorError({ error })]);
    });

    it('keeps the step on 429 and 503', () => {
      setup(challenge);
      const locked = httpError(429, 'Too many failed two-factor attempts');
      tokenTwoFactor.mockReturnValue(throwError(() => locked));
      expect(submit()).toEqual([
        AuthActions.tokenTwoFactorError({ error: locked }),
      ]);

      const unavailable = httpError(503, 'temporarily unavailable');
      tokenTwoFactor.mockReturnValue(throwError(() => unavailable));
      expect(submit()).toEqual([
        AuthActions.tokenTwoFactorError({ error: unavailable }),
      ]);
    });
  });

  describe('saveTokens$', () => {
    it('stores a pair that replaced the session', () => {
      setup(null);
      const setItem = vi.spyOn(Storage.prototype, 'setItemJson');
      effects.saveTokens$.subscribe();

      actions$.next(AuthActions.tokensReplaced({ tokenResponse: NEW_TOKENS }));

      expect(setItem).toHaveBeenCalledWith(
        ELocalStorageKey.TOKEN_RESPONSE,
        NEW_TOKENS,
      );
    });
  });

  describe('session', () => {
    let tokenRefresh: ReturnType<typeof vi.fn>;
    let logout: ReturnType<typeof vi.fn>;

    const setupSession = () => {
      tokenRefresh = vi.fn();
      logout = vi.fn();
      setup(null);
      TestBed.resetTestingModule();
      actions$ = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          AuthEffects,
          provideMockActions(() => actions$),
          provideMockStore({ initialState: testAppState }),
          {
            provide: AuthApiService,
            useValue: { tokenRefresh, logout },
          },
          { provide: Router, useValue: { navigate } },
          { provide: SnackService, useValue: { error: snackError } },
          {
            provide: TranslateService,
            useValue: { instant: (key: string) => key },
          },
        ],
      });
      effects = TestBed.inject(AuthEffects);
      localStorage.clear();
    };

    it('stores a refreshed pair', async () => {
      setupSession();
      tokenRefresh.mockReturnValue(of(NEW_TOKENS));
      const emitted = firstValueFrom(effects.refreshToken$);

      actions$.next(
        AuthActions.refreshToken({
          refreshToken: testAppState.auth.tokenResponse.refresh_token,
        }),
      );

      await expect(emitted).resolves.toEqual(
        AuthActions.refreshTokenSuccess({ tokenResponse: NEW_TOKENS }),
      );
    });

    it('leaves the account when refresh fails', async () => {
      setupSession();
      const error = httpError(401, 'Invalid or expired refresh token');
      tokenRefresh.mockReturnValue(throwError(() => error));
      const emitted = firstValueFrom(effects.refreshToken$);

      actions$.next(
        AuthActions.refreshToken({
          refreshToken: testAppState.auth.tokenResponse.refresh_token,
        }),
      );

      await expect(emitted).resolves.toEqual(
        AuthActions.refreshTokenError({ error }),
      );
      expect(navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('logs out and leaves the account', async () => {
      setupSession();
      logout.mockReturnValue(of(null));
      const emitted = firstValueFrom(effects.logout$);
      localStorage.setItem(ELocalStorageKey.TOKEN_RESPONSE, 'stored');
      localStorage.setItem(ELocalStorageKey.USER, 'stored');

      actions$.next(AuthActions.logout());

      await expect(emitted).resolves.toEqual(AuthActions.logoutSuccess());
      expect(logout).toHaveBeenCalledWith(
        testAppState.auth.tokenResponse.refresh_token,
      );
      expect(localStorage.getItem(ELocalStorageKey.TOKEN_RESPONSE)).toBeNull();
      expect(localStorage.getItem(ELocalStorageKey.USER)).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('leaves the account without calling the API', () => {
      setupSession();
      effects.$logoutSilent.subscribe();

      actions$.next(AuthActions.logoutSilent());

      expect(logout).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('reloads the user after a successful login', () => {
      setupSession();
      const dispatch = vi.spyOn(TestBed.inject(Store), 'dispatch');
      effects.getUserInfo.subscribe();

      actions$.next(AuthActions.tokenSuccess({ tokenResponse: NEW_TOKENS }));

      expect(dispatch).toHaveBeenCalledWith(UserActions.read());
    });

    it.each([
      ['tokenError', AuthActions.tokenError({ error: httpError(401, 'no') })],
      [
        'tokenTwoFactorError',
        AuthActions.tokenTwoFactorError({ error: httpError(401, 'no') }),
      ],
      [
        'refreshTokenError',
        AuthActions.refreshTokenError({ error: httpError(401, 'no') }),
      ],
      ['logoutError', AuthActions.logoutError({ error: httpError(401, 'no') })],
    ])('shows the snack for %s', (_name, action) => {
      setupSession();
      effects.showErrors$.subscribe();

      actions$.next(action);

      expect(snackError).toHaveBeenCalledWith(
        (action as { error: HttpErrorResponse }).error,
      );
    });
  });
});
