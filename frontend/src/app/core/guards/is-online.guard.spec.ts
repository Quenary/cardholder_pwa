import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { isOnlineGuard } from './is-online.guard';
import { Observable, firstValueFrom } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState } from 'src/testing';

describe('isOnlineGuard', () => {
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
        isOnlineGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
        ) as Observable<boolean>,
    );
  }

  it('should allow online', async () => {
    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
  });

  it('should reject not online', async () => {
    storeMock.setState({
      app: {
        isOnline: false,
      },
    });
    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
  });
});
