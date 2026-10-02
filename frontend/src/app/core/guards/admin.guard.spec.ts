import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { adminGuard } from './admin.guard';
import { firstValueFrom, Observable } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState } from 'src/testing';
import { EUserRole } from 'src/app/entities/user/user-interface';

describe('adminGuard', () => {
  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(() => {
    initialState = { ...testAppState };

    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    });

    storeMock = TestBed.inject(MockStore);
  });

  function runGuard() {
    return TestBed.runInInjectionContext(
      () =>
        adminGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
        ) as Observable<boolean>,
    );
  }

  describe('when user is admin', () => {
    it('allows navigation', async () => {
      storeMock.setState({
        user: {
          info: {
            role_code: EUserRole.ADMIN,
          },
        },
      });

      const result = await firstValueFrom(runGuard());

      expect(result).toBe(true);
    });
  });

  describe('when user is not admin', () => {
    it('blocks navigation', async () => {
      storeMock.setState({
        user: {
          info: {
            role_code: EUserRole.MEMBER,
          },
        },
      });
      const result = await firstValueFrom(runGuard());

      expect(result).toBe(false);
    });
  });
});
