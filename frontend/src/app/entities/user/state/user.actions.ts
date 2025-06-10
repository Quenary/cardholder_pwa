import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IUser, IUserUpdate } from '../user-interface';
import { HttpErrorResponse } from '@angular/common/http';

export const UserActions = createActionGroup({
  source: '[USER]',
  events: {
    // GET
    read: emptyProps(),
    'read success': props<{ info: IUser }>(),
    'read error': props<{ error: HttpErrorResponse }>(),
    // PUT
    update: props<{ body: IUserUpdate }>(),
    'update success': props<{ info: IUser }>(),
    'update error': props<{ error: HttpErrorResponse }>(),
    // DELETE
    'delete attempt': emptyProps(),
    delete: emptyProps(),
    'delete success': emptyProps(),
    'delete error': props<{ error: HttpErrorResponse }>(),
    'set form': props<{ form: IUserUpdate }>(),
  },
});
