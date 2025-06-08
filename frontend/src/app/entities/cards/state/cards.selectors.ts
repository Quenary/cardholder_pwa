import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ICardsState } from './cards.reducers';

const _selectCards = createFeatureSelector<ICardsState>('cards');
export const selectCards = createSelector(_selectCards, (state) => state);
export const selectActiveCard = createSelector(
  _selectCards,
  (state) => state.active
);
export const selectActiveCardHasChanges = createSelector(
  _selectCards,
  (state) => state.active?.hasChanges ?? false
);
