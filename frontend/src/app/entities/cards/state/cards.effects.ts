import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { CardsActions } from './cards.actions';
import {
  catchError,
  EMPTY,
  map,
  of,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { CardApiService } from '../cards-api.service';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectCardsActive, selectCardsActiveInfo } from './cards.selectors';
import { MatDialog } from '@angular/material/dialog';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { SnackService } from 'src/app/core/services/snack.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class CardsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly cardsApiService = inject(CardApiService);
  private readonly router = inject(Router);
  private readonly matDialog = inject(MatDialog);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);

  list$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.list),
      switchMap((action) =>
        this.cardsApiService.list().pipe(
          map((list) => CardsActions.listSuccess({ list })),
          catchError((error) => of(CardsActions.listError({ error }))),
        ),
      ),
    ),
  );

  read$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.read),
      switchMap((action) =>
        this.cardsApiService.read(action.id).pipe(
          map((info) => CardsActions.readSuccess({ info })),
          catchError((error) => of(CardsActions.readError({ error }))),
        ),
      ),
    ),
  );

  saveCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.saveCard),
      withLatestFrom(this.store.select(selectCardsActive)),
      switchMap(([action, active]) =>
        of(
          !!active.info
            ? CardsActions.update({ id: active.info.id, body: active.form })
            : CardsActions.create({ body: active.form }),
        ),
      ),
    ),
  );

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.create),
      switchMap((action) =>
        this.cardsApiService.create(action.body).pipe(
          map((info) => CardsActions.createSuccess({ info })),
          catchError((error) => of(CardsActions.createError({ error }))),
        ),
      ),
    ),
  );

  createSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(CardsActions.createSuccess),
        tap((action) => {
          this.router.navigate([`/cards/${action.info.id}`], {
            replaceUrl: true,
          });
        }),
      ),
    { dispatch: false },
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.update),
      switchMap((action) =>
        this.cardsApiService.update(action.id, action.body).pipe(
          map((info) => CardsActions.updateSuccess({ info })),
          catchError((error) => of(CardsActions.updateError({ error }))),
        ),
      ),
    ),
  );

  showSaveSnack$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(CardsActions.createSuccess, CardsActions.updateSuccess),
        tap(() => {
          this.snackService.success(
            this.translateService.instant('CARDS.CARD.SUCCESS.SAVE'),
          );
        }),
      ),
    { dispatch: false },
  );

  deleteAttempt$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.deleteAttempt),
      withLatestFrom(this.store.select(selectCardsActiveInfo)),
      switchMap(([action, info]) =>
        this.matDialog
          .open(ConfirmDialogComponent, {
            data: <IConfirmDialogData>{ title: 'GENERAL.DELETE_WARN' },
          })
          .afterClosed()
          .pipe(
            switchMap((res) =>
              res ? of(CardsActions.delete({ id: info.id })) : EMPTY,
            ),
          ),
      ),
    ),
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.delete),
      switchMap((action) =>
        this.cardsApiService.delete(action.id).pipe(
          map(() => CardsActions.deleteSuccess()),
          catchError((error) => of(CardsActions.deleteError({ error }))),
        ),
      ),
    ),
  );

  deleteSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(CardsActions.deleteSuccess),
        tap((action) => {
          this.snackService.success(
            this.translateService.instant('CARDS.CARD.SUCCESS.DELETE'),
          );
          this.router.navigate(['/cards'], { replaceUrl: true });
        }),
      ),
    { dispatch: false },
  );

  patchListItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.patchListItem),
      switchMap((action) =>
        this.cardsApiService.patch(action.id, action.body).pipe(
          map((card) => CardsActions.patchListItemSuccess({ card })),
          catchError((error) => of(CardsActions.patchListItemError({ error }))),
        ),
      ),
    ),
  );

  showErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          CardsActions.listError,
          CardsActions.createError,
          CardsActions.readError,
          CardsActions.updateError,
          CardsActions.deleteError,
          CardsActions.patchListItemError,
        ),
        tap((action) => {
          this.snackService.error(action.error);
        }),
      ),
    { dispatch: false },
  );
}
