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
  isLoading: boolean;
}
export const initialState: ICardsState = {
  list: [],
  active: null,
  isLoading: false,
};
export const cardsReducer = createReducer(
  initialState,
  on(
    CardsActions.list,
    CardsActions.create,
    CardsActions.read,
    CardsActions.update,
    CardsActions.delete,
    (state, payload) => ({
      ...state,
      isLoading: true,
    })
  ),
  on(CardsActions.listSuccess, (state, payload) => ({
    ...state,
    list: payload.list,
    isLoading: false,
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
      isLoading: false,
    })
  ),
  on(CardsActions.deleteSuccess, (state, payload) => ({
    ...state,
    active: null,
    isLoading: false,
  })),
  on(CardsActions.setForm, (state, payload) => {
    const info: ICardBase = state.active?.info ?? {
      code: null,
      code_type: null,
      name: null,
      description: null,
      color: null,
    };
    const hasChanges = Object.entries(payload.form).some(
      ([k, v]) => v != info[k as keyof ICardBase]
    );
    return {
      ...state,
      active: {
        ...state.active,
        form: payload.form,
        hasChanges,
      },
    };
  }),
  on(CardsActions.exitCard, (state, payload) => ({
    ...state,
    active: null,
  })),
  on(
    CardsActions.listError,
    CardsActions.createError,
    CardsActions.readError,
    CardsActions.updateError,
    CardsActions.deleteError,
    (state, payload) => ({
      ...state,
      isLoading: false,
    })
  )
);
