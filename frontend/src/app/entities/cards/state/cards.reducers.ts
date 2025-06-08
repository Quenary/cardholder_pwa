import { createReducer, on } from '@ngrx/store';
import { ICard, ICardBase } from '../cards-interface';
import { CardsActions } from './cards.actions';

export interface ICardsState {
  list: ICard[];
  active: {
    info: ICard;
    form: ICardBase;
    hasChanges: boolean;
  };
}
export const initialState: ICardsState = {
  list: [],
  active: null,
};
export const cardsReducer = createReducer(
  initialState,
  on(CardsActions.listSuccess, (state, payload) => ({
    ...state,
    list: payload.list,
  })),
  on(
    CardsActions.createSuccess,
    CardsActions.updateSuccess,
    CardsActions.readSuccess,
    (state, payload) => ({
      ...state,
      active: {
        ...state.active,
        info: payload.info,
        hasChanges: false,
      },
    })
  ),
  on(CardsActions.deleteSuccess, (state, payload) => ({
    ...state,
    active: null,
  })),
  on(CardsActions.setForm, (state, payload) => {
    const info: any = state.active?.info ?? {};
    const hasChanges = Object.entries(payload.form).some(
      ([k, v]) => v !== info[k]
    );
    return {
      ...state,
      active: {
        ...state.active,
        form: payload.form,
        hasChanges,
      },
    };
  })
);
