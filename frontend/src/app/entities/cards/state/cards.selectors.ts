import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ICardsState } from './cards.reducers';

const _selectCards = createFeatureSelector<ICardsState>('cards');
export const selectCards = createSelector(_selectCards, (state) => state);
export const selectCardsIsLoading = createSelector(
  _selectCards,
  (state) => state.isLoading
);
export const selectCardsList = createSelector(
  _selectCards,
  (state) => state.list
);
export const selectCardsActive = createSelector(
  _selectCards,
  (state) => state.active
);
export const selectCardsActiveCanDelete = createSelector(
  _selectCards,
  (state) => !!state.active?.info
);
export const selectCardsActiveInfo = createSelector(
  _selectCards,
  (state) => state.active?.info ?? null
);
export const selectCardsActiveHasChanges = createSelector(
  _selectCards,
  (state) => state.active?.hasChanges ?? false
);
