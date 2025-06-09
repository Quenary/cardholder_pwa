import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ICardsState } from './cards.reducers';
import { isValidCodeType } from '../cards-const';

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
/**
 * Selects valid viewer data of active card or null
 */
export const selectCardsActiveViewerData = createSelector(
  _selectCards,
  (state) => {
    const form = state.active?.form ?? state.active?.info;
    if (!form) {
      return null;
    }
    if (!form.code || !isValidCodeType(form.code_type)) {
      return null;
    }
    return {
      code: form.code,
      code_type: form.code_type,
    };
  }
);
