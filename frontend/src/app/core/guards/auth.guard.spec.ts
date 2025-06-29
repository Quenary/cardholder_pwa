import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  GuardResult,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { Observable } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState } from 'src/app/test';

describe('authGuard', () => {
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;
  let storeMock: MockStore;
  let initialState: ITestAppState;
  let routerMock: jasmine.SpyObj<Router>;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    initialState = { ...testAppState };
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: routerMock },
      ],
    });

    storeMock = TestBed.inject(MockStore);
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow authorized', (done) => {
    const result$ = executeGuard(
      dummyRoute,
      dummyState,
    ) as Observable<GuardResult>;
    result$.subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      expect(routerMock.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('should reject and navigate to /auth unauthorized', (done) => {
    storeMock.setState({
      auth: {
        init: true,
        tokenResponse: null,
      },
    });
    const result$ = executeGuard(
      dummyRoute,
      dummyState,
    ) as Observable<GuardResult>;
    result$.subscribe((canActivate) => {
      expect(canActivate).toBeFalse();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth']);
      done();
    });
  });
});
