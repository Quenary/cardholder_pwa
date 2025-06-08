import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { CardsActions } from './cards.actions';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { CardApiService } from '../cards-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Injectable()
export class CardsEffects {
  private readonly actions$ = inject(Actions);
  private readonly cardsApiService = inject(CardApiService);
  private readonly matStackBar = inject(MatSnackBar);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);

  list$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.list),
      switchMap((action) =>
        this.cardsApiService.list().pipe(
          map((list) => CardsActions.listSuccess({ list })),
          catchError((error) => of(CardsActions.listError({ error })))
        )
      )
    )
  );

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.create),
      switchMap((action) =>
        this.cardsApiService.create(action.body).pipe(
          map((info) => CardsActions.createSuccess({ info })),
          catchError((error) => of(CardsActions.createError({ error })))
        )
      )
    )
  );

  createSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(CardsActions.createSuccess),
        tap((action) => {
          this.router.navigate([`/cards/${action.info.id}`], {
            replaceUrl: true,
          });
        })
      ),
    { dispatch: false }
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.update),
      switchMap((action) =>
        this.cardsApiService.update(action.id, action.body).pipe(
          map((info) => CardsActions.updateSuccess({ info })),
          catchError((error) => of(CardsActions.updateError({ error })))
        )
      )
    )
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CardsActions.delete),
      switchMap((action) =>
        this.cardsApiService.delete(action.id).pipe(
          map(() => CardsActions.deleteSuccess()),
          catchError((error) => of(CardsActions.deleteError({ error })))
        )
      )
    )
  );

  deleteSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(CardsActions.deleteSuccess),
        tap((action) => {
          this.router.navigate(['/cards'], { replaceUrl: true });
        })
      ),
    { dispatch: false }
  );

  showErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          CardsActions.listError,
          CardsActions.createError,
          CardsActions.readError,
          CardsActions.updateError,
          CardsActions.deleteError
        ),
        tap((action) => {
          this.matStackBar.open(
            `${this.translateService.instant('GENERAL.REQUEST_ERROR')}: ${
              action.error.message
            }`,
            this.translateService.instant('GENERAL.CLOSE'),
            { duration: 10000 }
          );
        })
      ),
    { dispatch: false }
  );
}
