import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
import { map } from 'rxjs';
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
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFabButton } from '@angular/material/button';
import { CardCodeViewerComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { IsValidCardPipe } from 'src/app/shared/pipes/is-valid-card.pipe';
import { GetOnColorPipe } from 'src/app/shared/pipes/get-on-color.pipe';
import { IsOldCodeType } from 'src/app/shared/pipes/is-old-code-type.pipe';
import { MatDialog } from '@angular/material/dialog';
import {
  ISortFilterDialogData,
  ISortFilterDialogResult,
  SortFilterDialogComponent,
} from '../sort-filter-dialog/sort-filter-dialog.component';
import { ECardFieldType, ICard } from 'src/app/entities/cards/cards-interface';
import { Filter, Sorting } from 'src/app/shared/types';
import { ELocalStorageKey } from 'src/app/app.consts';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-cards',
  imports: [
    RouterOutlet,
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
    MatBadgeModule,
  ],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly matDialog = inject(MatDialog);

  public readonly showParent = toSignal(
    this.router.events.pipe(map(() => this.router.url === '/cards')),
    { initialValue: this.router.url === '/cards' },
  );
  public readonly cardsPlaceholder = Array(6).fill(null);
  public readonly isLoading = this.store.selectSignal(selectCardsIsLoading);
  /**
   * Form control for search field
   */
  public readonly searchControl = new FormControl<string>(null);

  /**
   * All cards
   */
  private readonly _cards = this.store.selectSignal(selectCardsList);
  private readonly _sorting = signal<Sorting.Model<ICard, keyof ICard>>(
    localStorage.getItemJson(ELocalStorageKey.CARD_SORTING) ?? {
      key: 'name',
      direction: 'asc',
    },
  );
  private readonly _filters = signal<Filter.Model<ICard, keyof ICard>[]>(
    localStorage.getItemJson(ELocalStorageKey.CARD_FILTERS),
  );
  public readonly filtersCount = computed(() => {
    const filters = this._filters();
    return filters?.length ?? 0;
  });
  /**
   * Search signal
   */
  private readonly _search = toSignal(this.searchControl.valueChanges, {
    initialValue: null,
  });
  /**
   * Filtered cards
   */
  public readonly cards = computed(() => {
    let cards = this._cards();
    let search = this._search();
    const sorting = this._sorting();
    const filters = this._filters();
    cards = [...cards];
    if (search) {
      search = search.toLowerCase();
      cards = cards.filter((item) => item.name.toLowerCase().includes(search));
    }
    if (sorting) {
      cards = Sorting.sortBy(cards, sorting, ECardFieldType[sorting.key]);
    }
    for (const f of filters ?? []) {
      cards = Filter.filterBy(cards, f, ECardFieldType[f.key]);
    }
    return cards.sort((a, b) => +b.is_favorite - +a.is_favorite);
  });
  /**
   * Filtered autocomplete list
   */
  public readonly autocompleteOptions = computed(() =>
    this.cards().map((item) => item.name),
  );

  constructor() {
    effect(() => {
      const showParent = this.showParent();
      if (showParent) {
        this.store.dispatch(CardsActions.list());
      }
    });
  }

  public toggleFavorite(card: ICard): void {
    const is_favorite = !card.is_favorite;
    this.store.dispatch(
      CardsActions.patchListItem({
        id: card.id,
        body: {
          is_favorite,
        },
      }),
    );
  }

  public updateUsedDate(card: ICard): void {
    const used_at = new Date().toJSON();
    this.store.dispatch(
      CardsActions.patchListItem({
        id: card.id,
        body: {
          used_at,
        },
      }),
    );
  }

  public openSortFilterDialog(): void {
    const data: ISortFilterDialogData<ICard> = {
      sorting: {
        options: [
          { key: 'name', label: 'CARDS.CARD.NAME' },
          { key: 'used_at', label: 'CARDS.CARD.USED_AT' },
          { key: 'updated_at', label: 'CARDS.CARD.UPDATED_AT' },
          { key: 'created_at', label: 'CARDS.CARD.CREATED_AT' },
        ],
        value: this._sorting(),
      },
      filter: {
        options: [
          {
            key: 'description',
            type: 'string',
            criterias: [
              Filter.Criteria.LIKE,
              Filter.Criteria.NOT_NULL,
              Filter.Criteria.NULL,
            ],
            label: 'CARDS.CARD.DESCRIPTION',
          },
          {
            key: 'code_type',
            type: 'string',
            criterias: [Filter.Criteria.LIKE],
            label: 'CARDS.CARD.CODE_TYPE',
          },
          {
            key: 'is_favorite',
            type: 'boolean',
            criterias: [Filter.Criteria.EQUALS],
            label: 'CARDS.CARD.IS_FAVORITE',
          },
          {
            key: 'used_at',
            type: 'date',
            criterias: [
              Filter.Criteria.GREATER_OR_EQUALS,
              Filter.Criteria.LESS_OR_EQUALS,
              Filter.Criteria.GREATER,
              Filter.Criteria.LESS,
            ],
            label: 'CARDS.CARD.USED_AT',
          },
          {
            key: 'updated_at',
            type: 'date',
            criterias: [
              Filter.Criteria.GREATER_OR_EQUALS,
              Filter.Criteria.LESS_OR_EQUALS,
              Filter.Criteria.GREATER,
              Filter.Criteria.LESS,
            ],
            label: 'CARDS.CARD.UPDATED_AT',
          },
          {
            key: 'created_at',
            type: 'date',
            criterias: [
              Filter.Criteria.GREATER_OR_EQUALS,
              Filter.Criteria.LESS_OR_EQUALS,
              Filter.Criteria.GREATER,
              Filter.Criteria.LESS,
            ],
            label: 'CARDS.CARD.CREATED_AT',
          },
        ],
        value: this._filters(),
      },
    };
    this.matDialog
      .open(SortFilterDialogComponent<ICard>, {
        data,
        width: 'calc(100% - 50px)',
        height: 'calc(100% - 50px)',
      })
      .afterClosed()
      .subscribe((res: ISortFilterDialogResult<ICard>) => {
        if (res) {
          const sortingModel = res.sortingModel ?? null;
          this._sorting.set(sortingModel);
          localStorage.setItemJson(ELocalStorageKey.CARD_SORTING, sortingModel);

          const filterModels = res.filterModels ?? null;
          this._filters.set(filterModels);
          localStorage.setItemJson(ELocalStorageKey.CARD_FILTERS, filterModels);
        }
      });
  }
}
