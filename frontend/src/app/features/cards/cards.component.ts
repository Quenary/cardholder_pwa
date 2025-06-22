import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
import { AsyncPipe } from '@angular/common';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
} from 'rxjs';
import {
  MatAutocomplete,
  MatOption,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import {} from '@angular/material/';
import {
  MatInput,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRipple } from '@angular/material/core';
import {
  selectCardsIsLoading,
  selectCardsList,
} from 'src/app/entities/cards/state/cards.selectors';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFabButton } from '@angular/material/button';
import { CardCodeViewerComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { IsValidCardPipe } from 'src/app/shared/pipes/is-valid-card.pipe';
import { GetOnColorPipe } from 'src/app/shared/pipes/get-on-color.pipe';
import { IsOldCodeType } from 'src/app/shared/pipes/is-old-code-type.pipe';

@Component({
  selector: 'app-cards',
  imports: [
    RouterOutlet,
    AsyncPipe,
    MatAutocomplete,
    MatOption,
    MatAutocompleteTrigger,
    MatInput,
    MatFormField,
    MatLabel,
    TranslateModule,
    MatIcon,
    MatSuffix,
    ReactiveFormsModule,
    MatRipple,
    MatFabButton,
    CardCodeViewerComponent,
    IsValidCardPipe,
    RouterLink,
    GetOnColorPipe,
    IsOldCodeType,
  ],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly showParent$ = this.router.events.pipe(
    startWith(null),
    map(() => this.router.url === '/cards'),
    distinctUntilChanged(),
    shareReplay(1)
  );
  public readonly cardsPlaceholder = Array(6).fill(null);
  public readonly isLoading$ = this.store
    .select(selectCardsIsLoading)
    .pipe(shareReplay(1));
  /**
   * All cards
   */
  private readonly _cards$ = this.store.select(selectCardsList);
  /**
   * Form control for search field
   */
  public readonly searchControl = new FormControl<string>(null);
  /**
   * Filtered cards
   */
  public readonly cards$ = combineLatest([
    this._cards$,
    this.searchControl.valueChanges.pipe(startWith(null)),
  ]).pipe(
    map(([list, search]) => {
      if (!search) {
        return list;
      }
      const searchLC = search.toLowerCase();
      return list.filter((item) => item.name.toLowerCase().includes(searchLC));
    })
  );
  /**
   * Filtered search options
   */
  public readonly autocompleteOptions$ = this.cards$.pipe(
    map((list) => list.map((item) => item.name))
  );

  ngOnInit(): void {
    this.showParent$
      .pipe(
        filter((res) => res),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.store.dispatch(CardsActions.list());
        },
      });
  }
}
