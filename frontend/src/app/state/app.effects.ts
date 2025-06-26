import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './app.actions';
import { catchError, delay, map, of, retry, tap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from '../shared/components/confirm-dialog/confirm-dialog.component';
import { ELocalStorageKey } from '../app.consts';
import { SystemApiService } from '../entities/system/system-api.service';
import {
  ChangelogDialogComponent,
  IChangelogComponentData,
} from '../shared/components/changelog/changelog.component';

@Injectable()
export class AppEffects {
  private readonly actions$ = inject(Actions);
  private readonly matDialog = inject(MatDialog);
  private readonly translateService = inject(TranslateService);
  private readonly systemApiService = inject(SystemApiService);

  init$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.init),
        tap(() => {
          const afterUpdate = localStorage.getItemJson(
            ELocalStorageKey.AFTER_UPDATE,
          );
          localStorage.removeItem(ELocalStorageKey.AFTER_UPDATE);

          this.systemApiService
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
}
