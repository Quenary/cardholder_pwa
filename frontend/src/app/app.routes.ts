import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { provideState, Store } from '@ngrx/store';
import { cardsReducer } from './entities/cards/state/cards.reducers';
import { provideEffects } from '@ngrx/effects';
import { CardsEffects } from './entities/cards/state/cards.effects';
import { inject } from '@angular/core';
import { selectCardsActiveHasChanges } from './entities/cards/state/cards.selectors';
import { canDeactivateWithDialogGuard } from './core/guards/can-deactivate-with-dialog.guard';
import { userReducer } from './entities/user/state/user.reducers';
import { UserEffects } from './entities/user/state/user.effects';
import { isOnlineGuard } from './core/guards/is-online.guard';
import { TranslateService } from '@ngx-translate/core';

const titleTranslate = (titleKey: string) => () => {
  const translateService = inject(TranslateService);
  return translateService.instant(titleKey);
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/cards',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    title: titleTranslate('NAV.AUTH'),
    loadComponent: () =>
      import('./features/auth/auth.component').then((c) => c.AuthComponent),
  },
  {
    path: 'register',
    title: titleTranslate('NAV.REGISTER'),
    loadComponent: () =>
      import('./features/register/register.component').then(
        (c) => c.RegisterComponent
      ),
  },
  {
    path: 'cards',
    canActivate: [authGuard],
    title: titleTranslate('NAV.CARD'),
    loadComponent: () =>
      import('./features/cards/cards.component').then((c) => c.CardsComponent),
    children: [
      {
        path: ':id',
        canActivate: [isOnlineGuard],
        loadComponent: () =>
          import('./features/card/card.component').then((c) => c.CardComponent),
        canDeactivate: [
          () => {
            const store = inject(Store);
            return canDeactivateWithDialogGuard([
              store.select(selectCardsActiveHasChanges),
            ]);
          },
        ],
      },
    ],
    providers: [
      provideState('cards', cardsReducer),
      provideEffects(CardsEffects),
    ],
  },
  {
    path: 'user',
    canActivate: [authGuard, isOnlineGuard],
    title: titleTranslate('NAV.USER'),
    loadComponent: () =>
      import('./features/user/user.component').then((c) => c.UserComponent),
    providers: [provideState('user', userReducer), provideEffects(UserEffects)],
  },
];
