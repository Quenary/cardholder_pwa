import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './app.actions';
import { tap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from '../shared/components/confirm-dialog/confirm-dialog.component';

@Injectable()
export class AppEffects {
  private readonly actions$ = inject(Actions);
  private readonly matDialog = inject(MatDialog);
  private readonly translateService = inject(TranslateService);

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
                document.location.reload();
              }
            });
        })
      ),
    { dispatch: false }
  );

  unrecoverable$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.unrecoverable),
        tap((action) => {
          document.location.reload();
        })
      ),
    { dispatch: false }
  );
}
