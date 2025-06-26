import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './app.actions';
import { catchError, first, map, of, skip, switchMap, tap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from '../shared/components/confirm-dialog/confirm-dialog.component';
import { ELocalStorageKey } from '../app.consts';
import { PublicApiService } from '../entities/public/public-api.service';
import {
  ChangelogDialogComponent,
  IChangelogComponentData,
} from '../shared/components/changelog/changelog.component';
import { Store } from '@ngrx/store';
import { SnackService } from '../core/services/snack.service';
import { selectAppVersion } from './app.selectors';

@Injectable()
export class AppEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly matDialog = inject(MatDialog);
  private readonly translateService = inject(TranslateService);
  private readonly publicApiService = inject(PublicApiService);
  private readonly snackService = inject(SnackService);

  init$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.init),
        tap(() => {
          const afterUpdate = localStorage.getItemJson(
            ELocalStorageKey.AFTER_UPDATE,
          );
          localStorage.removeItem(ELocalStorageKey.AFTER_UPDATE);

          this.store
            .select(selectAppVersion)
            .pipe(
              skip(1),
              first(),
              map((res) => res?.image_version ?? null),
            )
            .subscribe((version) => {
              if (!version) {
                return;
              }

              const lastVersion = localStorage.getItem(
                ELocalStorageKey.VERSION,
              );
              if (!lastVersion) {
                localStorage.setItem(ELocalStorageKey.VERSION, version);
                return;
              }

              if (version !== lastVersion && afterUpdate) {
                localStorage.setItem(ELocalStorageKey.VERSION, version);
                // Versions in changelog saved without previx
                const compareTo = lastVersion.replace('v', '');
                this.matDialog.open(ChangelogDialogComponent, {
                  data: <IChangelogComponentData>{
                    versionPredicate: (v) => v > compareTo,
                  },
                  autoFocus: false,
                });
              }
            });

          this.store.dispatch(AppActions.getPublicSettings());
          this.store.dispatch(AppActions.getVersion());
        }),
      ),
    { dispatch: false },
  );

  versionReady$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.versionReady),
        tap((action) => {
          const {
            TITLE: title,
            SUBTITLE: subtitle,
            RELOAD: confirmText,
          } = this.translateService.instant('UPDATE');
          this.matDialog
            .open(ConfirmDialogComponent, {
              data: <IConfirmDialogData>{ title, subtitle, confirmText },
            })
            .afterClosed()
            .subscribe((res) => {
              if (res) {
                localStorage.setItemJson(ELocalStorageKey.AFTER_UPDATE, true);
                document.location.reload();
              }
            });
        }),
      ),
    { dispatch: false },
  );

  unrecoverable$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.unrecoverable),
        tap((action) => {
          document.location.reload();
        }),
      ),
    { dispatch: false },
  );

  getPublicSettings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.getPublicSettings),
      switchMap(() =>
        this.publicApiService.settings().pipe(
          map((settings) => AppActions.getPublicSettingsSuccess({ settings })),
          catchError((error) =>
            of(AppActions.getPublicSettingsError({ error })),
          ),
        ),
      ),
    ),
  );

  getVersion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.getVersion),
      switchMap(() =>
        this.publicApiService.version().pipe(
          map((version) => AppActions.getVersionSuccess({ version })),
          catchError((error) => of(AppActions.getVersionError({ error }))),
        ),
      ),
    ),
  );

  showErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.getPublicSettingsError, AppActions.getVersionError),
        tap((action) => {
          this.snackService.error(action.error);
        }),
      ),
    { dispatch: false },
  );
}
