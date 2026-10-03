import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { ITestAppState, testAppState } from 'src/testing';
import { getTokenInterceptor } from './token.interceptor';

const URL = '/api/cards';

const withAccessToken = (
  state: ITestAppState,
  access_token: string,
): ITestAppState => ({
  ...state,
  auth: {
    ...state.auth,
    tokenResponse: { ...state.auth.tokenResponse, access_token },
  },
});

describe('getTokenInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(() => {
    initialState = { ...testAppState };
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideHttpClient(withInterceptors([getTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    storeMock = TestBed.inject(MockStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('outgoing request', () => {
    it('adds the bearer token', () => {
      httpClient.get(URL).subscribe();

      const req = httpMock.expectOne(URL);
      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer valid-access-token',
      );
      req.flush({});
    });
  });

  describe('401 response', () => {
    it('dispatches refresh and retries', () => {
      const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
      httpClient.get(URL).subscribe();

      httpMock
        .expectOne(URL)
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AuthActions.refreshToken({ refreshToken: 'valid-refresh-token' }),
      );

      storeMock.setState(
        withAccessToken(initialState, 'refreshed-access-token'),
      );

      const retry = httpMock.expectOne(URL);
      expect(retry.request.headers.get('Authorization')).toBe(
        'Bearer refreshed-access-token',
      );
      retry.flush({});
    });

    it('reuses a token another request already refreshed', () => {
      const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
      httpClient.get(URL).subscribe();

      const req = httpMock.expectOne(URL);
      storeMock.setState(
        withAccessToken(initialState, 'refreshed-access-token'),
      );
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      const retry = httpMock.expectOne(URL);
      expect(retry.request.headers.get('Authorization')).toBe(
        'Bearer refreshed-access-token',
      );
      expect(dispatchSpy).not.toHaveBeenCalled();
      retry.flush({});
    });

    it('returns the error when refresh clears tokens', () => {
      let status: number | undefined;
      httpClient.get(URL).subscribe({ error: (err) => (status = err.status) });

      httpMock
        .expectOne(URL)
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      storeMock.setState({
        ...initialState,
        auth: { ...initialState.auth, tokenResponse: null },
      });

      expect(status).toBe(401);
    });
  });
});
