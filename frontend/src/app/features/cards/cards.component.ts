import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { IAppState } from 'src/app/app.state';
import { ICard } from 'src/app/entities/cards/cards-interface';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
import { selectCards } from 'src/app/entities/cards/state/cards.selectors';

@Component({
  selector: 'app-cards',
  imports: [],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
})
export class CardsComponent implements OnInit {
  private readonly store = inject(Store<IAppState>);
  private readonly router = inject(Router);
  public readonly cards = this.store.select(selectCards);

  ngOnInit(): void {
    this.store.dispatch(CardsActions.list());
  }

  public openCard(cardId: number | 'new'): void {
    this.router.navigate([`/cards/${cardId}`]);
  }
}
