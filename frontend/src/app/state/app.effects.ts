import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './app.actions';
import { catchError, delay, map, of, retry, switchMap, tap } from 'rxjs';
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
          this.store.dispatch(AppActions.getPublicSettings());

          const afterUpdate = localStorage.getItemJson(
            ELocalStorageKey.AFTER_UPDATE,
          );
          localStorage.removeItem(ELocalStorageKey.AFTER_UPDATE);

          this.publicApiService
            .version()
            .pipe(
              delay(500),
              map((res) => res?.image_version ?? null),
              retry({ count: 1, delay: 1000 }),
              catchError(() => of(null)),
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
                this.matDialog.open(ChangelogDialogComponent, {
                  data: <IChangelogComponentData>{
                    versionPredicate: (v) => v > lastVersion,
                  },
                  autoFocus: false,
                });
              }
            });
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

  showErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.getPublicSettingsError),
        tap((action) => {
          this.snackService.error(action.error);
        }),
      ),
    { dispatch: false },
  );
}
