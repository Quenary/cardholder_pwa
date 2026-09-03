import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
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
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRipple } from '@angular/material/core';
import {
  selectCardsIsLoading,
  selectCardsList,
} from 'src/app/entities/cards/state/cards.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFabButton } from '@angular/material/button';
import { CardCodeViewerDialogComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { CardPreviewComponent } from 'src/app/shared/components/card-preview/card-preview.component';
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
import { CardShareApiService } from '../shared-cards/services/card-share-api.service';
import { ISharedWithMeItem } from '../shared-cards/shared-cards.interface';

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
    TranslatePipe,
    MatIcon,
    MatSuffix,
    ReactiveFormsModule,
    MatRipple,
    MatFabButton,
    CardPreviewComponent,
    RouterLink,
    IsOldCodeType,
    MatBadgeModule,
  ],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
})
export class CardsComponent {
  private readonly store = inject(Store);
  private readonly matDialog = inject(MatDialog);
  private readonly cardShareApiService = inject(CardShareApiService);

  protected readonly showParent = signal<boolean>(true);
  protected readonly cardsPlaceholder: number[] = Array(6).fill(Math.random());
  protected readonly sharedCards = signal<ISharedWithMeItem[]>([]);
  protected readonly isLoading = this.store.selectSignal(selectCardsIsLoading);
  /**
   * Form control for search field
   */
  protected readonly searchControl = new FormControl<string>(null);
  /**
   * Count of active filters
   */
  protected readonly filtersCount = computed(() => {
    const filters = this._filters();
    return filters?.length ?? 0;
  });
  /**
   * Filtered cards
   */
  protected readonly cards = computed(() => {
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
  protected readonly autocompleteOptions = computed(() => [
    ...this.cards().map((item) => item.name),
    ...this.filteredSharedCards().map((item) => item.card.name),
  ]);

  /**
   * Filtered cards shared with current user
   */
  protected readonly filteredSharedCards = computed(() => {
    let items = this.sharedCards();
    let search = this._search();
    const sorting = this._sorting();
    const filters = this._filters();
    items = [...items];

    if (search) {
      search = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.card.name.toLowerCase().includes(search) ||
          item.owner.username.toLowerCase().includes(search),
      );
    }

    for (const f of filters ?? []) {
      items = items.filter((item) => {
        const filtered = Filter.filterBy([item.card], f, ECardFieldType[f.key]);
        return filtered.length > 0;
      });
    }

    if (sorting) {
      const sortedCards = Sorting.sortBy(
        items.map((i) => i.card),
        sorting,
        ECardFieldType[sorting.key],
      );
      const cardOrder = new Map(sortedCards.map((c, idx) => [c.id, idx]));
      items.sort(
        (a, b) =>
          (cardOrder.get(a.card.id) ?? 0) - (cardOrder.get(b.card.id) ?? 0),
      );
    }

    return items;
  });

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
  /**
   * Search signal
   */
  private readonly _search = toSignal(this.searchControl.valueChanges, {
    initialValue: null,
  });

  constructor() {
    effect(() => {
      const showParent = this.showParent();
      if (showParent) {
        this.store.dispatch(CardsActions.list());
        this.cardShareApiService.getCardsSharedWithMe().subscribe({
          next: (items) => this.sharedCards.set(items),
        });
      }
    });
  }

  protected toggleFavorite(card: ICard): void {
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

  /**
   * Shows the code full size, which is what tapping a card is for: the point of
   * opening it is to have the code scanned at a till.
   *
   * A card showing its logo has no code preview to tap, so the logo takes over
   * that role and opens the very same dialog the preview would have opened.
   * Navigating to the card screen is left to the surrounding routerLink, which
   * still fires when the header or the name is tapped.
   */
  protected showCode(card: ICard): void {
    this.updateUsedDate(card);
    this.matDialog.open(CardCodeViewerDialogComponent, {
      width: 'calc(100% - 50px)',
      height: 'calc(100% - 50px)',
      // `color` is left out on purpose: the dialog component defaults it to the
      // current theme colour, same as the preview does.
      data: {
        card,
        scale: 6,
      },
    });
  }

  /**
   * Opens code viewer for shared card without updating used_at.
   */
  protected showSharedCardCode(card: ICard): void {
    this.matDialog.open(CardCodeViewerDialogComponent, {
      width: 'calc(100% - 50px)',
      height: 'calc(100% - 50px)',
      data: {
        card,
        scale: 6,
      },
    });
  }

  protected updateUsedDate(card: ICard): void {
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

  protected openSortFilterDialog(): void {
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
