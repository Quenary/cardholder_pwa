import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { provideState, Store } from '@ngrx/store';
import { cardsReducer } from './entities/cards/state/cards.reducers';
import { provideEffects } from '@ngrx/effects';
import { CardsEffects } from './entities/cards/state/cards.effects';
import { inject } from '@angular/core';
import { selectCardsActiveHasChanges } from './entities/cards/state/cards.selectors';
import { canDeactivateWithDialogGuard } from './core/guards/can-deactivate-with-dialog.guard';
import { isOnlineGuard } from './core/guards/is-online.guard';
import { TranslateService } from '@ngx-translate/core';
import { selectUserHasChanges } from './entities/user/state/user.selectors';
import { adminGuard } from './core/guards/admin.guard';

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
  // UNAUTHORIZED
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
    path: 'password-recovery',
    title: titleTranslate('NAV.PASSWORD_RECOVERY'),
    children: [
      {
        path: 'request',
        loadComponent: () =>
          import(
            './features/password-recovery-request/password-recovery-request.component'
          ).then((c) => c.PasswordRecoveryRequestComponent),
      },
      {
        path: 'submit',
        loadComponent: () =>
          import(
            './features/password-recovery-submit/password-recovery-submit.component'
          ).then((c) => c.PasswordRecoverySubmitComponent),
      },
    ],
  },
  // AUTHORIZED
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
    canDeactivate: [
      () => {
        const store = inject(Store);
        return canDeactivateWithDialogGuard([
          store.select(selectUserHasChanges),
        ]);
      },
    ],
    title: titleTranslate('NAV.USER'),
    loadComponent: () =>
      import('./features/user/user.component').then((c) => c.UserComponent),
  },
  {
    path: 'admin',
    title: titleTranslate('NAV.ADMIN'),
    canActivate: [authGuard, adminGuard, isOnlineGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then((c) => c.AdminComponent),
  },
  {
    path: 'about',
    title: titleTranslate('NAV.ABOUT'),
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/about/about.component').then((c) => c.AboutComponent),
  },
];
