import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, EMPTY, map, of, switchMap, tap } from 'rxjs';
import { UserActions } from './user.actions';
import { UserApiService } from '../user-api.service';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { AuthActions } from '../../auth/state/auth.actions';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly userApiService = inject(UserApiService);
  private readonly store = inject(Store);
  private readonly matDialog = inject(MatDialog);

  read$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.read),
      switchMap(() =>
        this.userApiService.read().pipe(
          map((info) => UserActions.readSuccess({ info })),
          catchError((error) => of(UserActions.readError({ error })))
        )
      )
    )
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.update),
      switchMap((action) =>
        this.userApiService.update(action.body).pipe(
          map((info) => UserActions.updateSuccess({ info })),
          catchError((error) => of(UserActions.updateError({ error })))
        )
      )
    )
  );

  deleteAttempt$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.deleteAttempt),
      switchMap((action) =>
        this.matDialog
          .open(ConfirmDialogComponent, {
            data: <IConfirmDialogData>{
              addCheckbox: true,
              title: 'GENERAL.DELETE_WARN',
              subtitle: 'USER.DELETE_WARN',
            },
            minHeight: '220px',
          })
          .afterClosed()
          .pipe(switchMap((res) => (res ? of(UserActions.delete()) : EMPTY)))
      )
    )
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.delete),
      switchMap((action) =>
        this.userApiService.delete().pipe(
          map(() => UserActions.deleteSuccess()),
          catchError((error) => of(UserActions.deleteError({ error })))
        )
      )
    )
  );

  deleteSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UserActions.deleteSuccess),
        tap(() => {
          this.store.dispatch(AuthActions.logoutSilent());
        })
      ),
    { dispatch: false }
  );
}
