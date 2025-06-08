import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ICard, ICardBase } from '../cards-interface';
import { HttpErrorResponse } from '@angular/common/http';

export const CardsActions = createActionGroup({
  source: '[CARD]',
  events: {
    list: emptyProps(),
    'list success': props<{ list: ICard[] }>(),
    'list error': props<{ error: HttpErrorResponse }>(),
    // POST
    create: props<{ body: ICardBase }>(),
    'create success': props<{ info: ICard }>(),
    'create error': props<{ error: HttpErrorResponse }>(),
    // GET
    read: props<{ id: number }>(),
    'read success': props<{ info: ICard }>(),
    'read error': props<{ error: HttpErrorResponse }>(),
    // PUT
    update: props<{ id: number; body: ICardBase }>(),
    'update success': props<{ info: ICard }>(),
    'update error': props<{ error: HttpErrorResponse }>(),
    // DELETE
    'delete attempt': emptyProps(),
    delete: props<{ id: number }>(),
    'delete success': emptyProps(),
    'delete error': props<{ error: HttpErrorResponse }>(),
    'set form': props<{ form: ICardBase }>(),
    'save card': emptyProps(),
    'exit card': emptyProps(),
  },
});
