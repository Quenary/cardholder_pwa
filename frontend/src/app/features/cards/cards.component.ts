import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
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
import { MatFabButton, MatIconButton } from '@angular/material/button';
import { CardCodeViewerComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { IsValidCardPipe } from 'src/app/shared/pipes/is-valid-card.pipe';
import { GetOnColorPipe } from 'src/app/shared/pipes/get-on-color.pipe';
import { IsOldCodeType } from 'src/app/shared/pipes/is-old-code-type.pipe';
import { ICard } from 'src/app/entities/cards/cards-interface';

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
    MatIconButton,
  ],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

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
    cards = [...cards];
    if (search) {
      search = search.toLowerCase();
      cards = cards.filter((item) => item.name.toLowerCase().includes(search));
    }
    return cards.sort((a, b) => +b.isFavorite - +a.isFavorite);
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
    const isFavorite = !card.isFavorite;
    this.store.dispatch(
      CardsActions.patchListItem({
        id: card.id,
        body: {
          isFavorite,
        },
      }),
    );
  }
}
