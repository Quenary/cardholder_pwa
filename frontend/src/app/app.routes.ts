import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { provideState } from '@ngrx/store';
import { cardsReducer } from './entities/cards/state/cards.reducers';
import { provideEffects } from '@ngrx/effects';
import { CardsEffects } from './entities/cards/state/cards.effects';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/cards',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth.component').then((c) => c.AuthComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/register/register.component').then(
        (c) => c.RegisterComponent
      ),
  },
  {
    path: 'cards',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cards/cards.component').then((c) => c.CardsComponent),
    children: [
      {
        path: ':id',
        loadComponent: () =>
          import('./features/card/card.component').then((c) => c.CardComponent),
      },
    ],
    providers: [
      provideState('cards', cardsReducer),
      provideEffects(CardsEffects),
    ],
  },
  {
    path: 'user',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/user/user.component').then((c) => c.UserComponent),
  },
];
