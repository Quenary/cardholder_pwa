import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  GuardResult,
  RouterStateSnapshot,
} from '@angular/router';
import { adminGuard } from './admin.guard';
import { Observable, of } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState } from 'src/app/test';
import { EUserRole } from 'src/app/entities/user/user-interface';

describe('adminGuard', () => {
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;
  let storeMock: MockStore;
  let initialState: ITestAppState;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

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

  it('should allow admin', (done) => {
    storeMock.setState({
      user: {
        info: {
          role_code: EUserRole.ADMIN,
        },
      },
    });
    const result$ = executeGuard(
      dummyRoute,
      dummyState,
    ) as Observable<GuardResult>;
    result$.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      done();
    });
  });

  it('should reject not admin', (done) => {
    storeMock.setState({
      user: {
        info: {
          role_code: EUserRole.MEMBER,
        },
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
