import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  MatSidenavContainer,
  MatSidenav,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  onClick?: Function;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    TranslateModule,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly store = inject(Store);
  private readonly translateService = inject(TranslateService);

  public readonly isOffline = this.store.selectSignal(selectAppIsOffline);

  private readonly isAdmin = this.store.selectSignal(selectUserIsAdmin);
  private readonly navTranslates = toSignal(this.translateService.get('NAV'));
  public readonly links = computed<INavItem[]>(() => {
    const isAdmin = this.isAdmin();
    const navTranslates = this.navTranslates();
    return [
      {
        name: navTranslates.CARD,
        icon: 'credit_card_outlined',
        link: '/cards',
      },
      {
        name: navTranslates.USER,
        icon: 'person_outlined',
        link: '/user',
      },
      ...(isAdmin
        ? [
            {
              name: navTranslates.ADMIN,
              icon: 'admin_panel_settings',
              link: '/admin',
            },
          ]
        : []),
      {
        name: navTranslates.ABOUT,
        icon: 'info_outlined',
        link: '/about',
      },
      {
        name: navTranslates.EXIT,
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
  public readonly isAuthorized = this.store.selectSignal(
    selectAuthIsAuthorized,
  );
  /**
   * Side nav opened flag
   */
  public readonly sidenavOpened = signal(false);
}
