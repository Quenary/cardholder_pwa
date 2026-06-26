import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  MatSidenavContainer,
  MatSidenav,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import {
  MatNavList,
  MatListItem,
  MatListItemIcon,
} from '@angular/material/list';
import { Store } from '@ngrx/store';
import { selectAuthIsAuthorized } from './entities/auth/state/auth.selectors';
import { AuthActions } from './entities/auth/state/auth.actions';
import { selectAppIsOffline } from './state/app.selectors';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { selectUserIsAdmin } from './entities/user/state/user.selectors';
import { toSignal } from '@angular/core/rxjs-interop';

interface INavItem {
  name: string;
  icon: string;
  link?: string;
  onClick?: () => unknown;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    TranslatePipe,
    RouterLink,
    MatIcon,
    MatToolbar,
    MatListItem,
    MatNavList,
    MatListItemIcon,
    RouterLinkActive,
    MatIconButton,
    MatProgressSpinner,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly store = inject(Store);
  private readonly translateService = inject(TranslateService);

  protected readonly isOffline = this.store.selectSignal(selectAppIsOffline);

  protected readonly links = computed<INavItem[]>(() => {
    const isAdmin = this.isAdmin();
    const navTranslations = this.navTranslations();
    return [
      {
        name: navTranslations.CARD,
        icon: 'credit_card_outlined',
        link: '/cards',
      },
      {
        name: navTranslations.USER,
        icon: 'person_outlined',
        link: '/user',
      },
      ...(isAdmin
        ? [
            {
              name: navTranslations.ADMIN,
              icon: 'admin_panel_settings',
              link: '/admin',
            },
          ]
        : []),
      {
        name: navTranslations.ABOUT,
        icon: 'info_outlined',
        link: '/about',
      },
      {
        name: navTranslations.EXIT,
        icon: 'logout',
        onClick: () => {
          this.store.dispatch(AuthActions.logout());
        },
      },
    ];
  });
  /**
   * Whether to show authorized content (navigation, header, e.g.)
   */
  protected readonly isAuthorized = this.store.selectSignal(
    selectAuthIsAuthorized,
  );
  /**
   * Side nav opened flag
   */
  protected readonly sidenavOpened = signal(false);

  private readonly isAdmin = this.store.selectSignal(selectUserIsAdmin);
  private readonly navTranslations = toSignal(
    this.translateService.getStreamOnTranslationChange('NAV'),
  );
}
