import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  MatSidenavContainer,
  MatSidenav,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { combineLatest, map, Observable } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AsyncPipe } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import {
  MatNavList,
  MatListItem,
  MatListItemIcon,
} from '@angular/material/list';
import { Store } from '@ngrx/store';
import { selectAuthTokenResponse } from './entities/auth/state/auth.selectors';
import { AuthActions } from './entities/auth/state/auth.actions';
import { selectAppIsOffline } from './state/app.selectors';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { selectUserIsAdmin } from './entities/user/state/user.selectors';

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
    AsyncPipe,
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
  public readonly isOffline$ = this.store.select(selectAppIsOffline);
  /**
   * Items for side nav panel
   */
  public readonly links$: Observable<INavItem[]> = combineLatest([
    this.translateService.get('NAV'),
    this.store.select(selectUserIsAdmin),
  ]).pipe(
    map(([translates, isAdmin]) => [
      {
        name: translates.CARD,
        icon: 'credit_card_outlined',
        link: '/cards',
      },
      {
        name: translates.USER,
        icon: 'person_outlined',
        link: '/user',
      },
      ...(isAdmin
        ? [
            {
              name: translates.ADMIN,
              icon: 'admin_panel_settings',
              link: '/admin',
            },
          ]
        : []),
      {
        name: translates.ABOUT,
        icon: 'info_outlined',
        link: '/about',
      },
      {
        name: translates.EXIT,
        icon: 'logout',
        onClick: () => {
          this.store.dispatch(AuthActions.logout());
        },
      },
    ])
  );
  /**
   * Whether to show authorized content (navigation, header, e.g.)
   */
  public readonly isAuthorized$ = this.store
    .select(selectAuthTokenResponse)
    .pipe(map((res) => !!res));
  /**
   * Side nav opened flag
   */
  public sidenavOpened: boolean = false;
}
