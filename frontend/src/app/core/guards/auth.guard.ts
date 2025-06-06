import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { IAppState } from 'src/app/app.state';

export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store<IAppState>);
  
  return true;
};
