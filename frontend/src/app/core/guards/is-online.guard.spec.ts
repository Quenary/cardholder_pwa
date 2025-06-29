import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  GuardResult,
  RouterStateSnapshot,
} from '@angular/router';
import { isOnlineGuard } from './is-online.guard';
import { Store } from '@ngrx/store';
import { of, Observable } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState } from 'src/app/test';

describe('isOnlineGuard', () => {
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;
  let storeMock: MockStore;
  let initialState: ITestAppState;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => isOnlineGuard(...guardParameters));

  beforeEach(() => {
    initialState = { ...testAppState };

    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    });
    storeMock = TestBed.inject(MockStore);
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow online', (done) => {
    const result$ = executeGuard(
      dummyRoute,
      dummyState,
    ) as Observable<GuardResult>;
    result$.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      done();
    });
  });

  it('should reject not online', (done) => {
    storeMock.setState({
      app: {
        isOnline: false,
      },
    });
    const result$ = executeGuard(
      dummyRoute,
      dummyState,
    ) as Observable<GuardResult>;
    result$.subscribe((canActivate) => {
      expect(canActivate).toBeFalse();
      done();
    });
  });
});
