import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/card',
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
    path: 'card',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/card/card.component').then((c) => c.CardComponent),
  },
  {
    path: 'user',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/user/user.component').then((c) => c.UserComponent),
  },
];
