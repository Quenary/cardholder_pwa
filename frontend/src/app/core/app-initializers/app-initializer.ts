import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppActions } from 'src/app/state/app.actions';

export const appInitializer = () => {
  const store = inject(Store);
  store.dispatch(AppActions.init());
};
