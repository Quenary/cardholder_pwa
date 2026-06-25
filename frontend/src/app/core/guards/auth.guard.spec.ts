import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { firstValueFrom, Observable } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState } from 'src/testing';
import { Mocked } from 'vitest';

describe('authGuard', () => {
  let storeMock: MockStore;
  let initialState: ITestAppState;
  let routerMock: Partial<Mocked<Router>>;

  beforeEach(() => {
    initialState = { ...testAppState };
    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: routerMock },
      ],
    });

    storeMock = TestBed.inject(MockStore);
  });

  function runGuard() {
    return TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
        ) as Observable<boolean>,
    );
  }

  it('should allow authorized', async () => {
    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should reject and navigate to /auth unauthorized', async () => {
    storeMock.setState({
      auth: {
        init: true,
        tokenResponse: null,
      },
    });
    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth']);
  });
});
