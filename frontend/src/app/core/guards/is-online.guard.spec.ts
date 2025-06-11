import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { isOnlineGuard } from './is-online.guard';

describe('isOnlineGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => isOnlineGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
