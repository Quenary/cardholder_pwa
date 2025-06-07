import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  MatSidenavContainer,
  MatSidenav,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { first, map, Observable } from 'rxjs';
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
import { IAppState } from './app.state';
import { selectAuthTokenResponse } from './entities/auth/state/auth.selectors';
import { AuthActions } from './entities/auth/state/auth.actions';

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
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly store = inject(Store<IAppState>);
  private readonly translateService = inject(TranslateService);
  /**
   * Items for side nav panel
   */
  public readonly links$: Observable<INavItem[]> = this.translateService
    .get('NAV')
    .pipe(
      map((translates) => [
        {
          name: translates.CARD,
          icon: 'credit_card',
          link: '/card',
        },
        {
          name: translates.USER,
          icon: 'person',
          link: '/user',
        },
        {
          name: translates.EXIT,
          icon: 'logout',
          onClick: () => {
            this.store
              .select(selectAuthTokenResponse)
              .pipe(first())
              .subscribe({
                next: (tokenResponse) => {
                  this.store.dispatch(
                    AuthActions.logout({
                      refreshToken: tokenResponse.refresh_token,
                    })
                  );
                },
              });
          },
        },
      ])
    );
  /**
   * Whether to show toolbar (side nav button, title)
   */
  public readonly showToolbar$ = this.store
    .select(selectAuthTokenResponse)
    .pipe(map((res) => !!res));
  /**
   * Side nav opened flag
   */
  public sidenavOpened: boolean = false;
}
