import { HttpErrorResponse } from '@angular/common/http';
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  IOAuth2PasswordRequestForm,
  ITokenResponse,
} from 'src/app/entities/auth/auth-interface';

export const AuthActions = createActionGroup({
  source: '[AUTH]',
  events: {
    token: props<{ body: IOAuth2PasswordRequestForm }>(),
    'token success': props<{ tokenResponse: ITokenResponse }>(),
    'token error': props<{ error: HttpErrorResponse }>(),
    'refresh token': props<{ refreshToken: string }>(),
    'refresh token success': props<{ tokenResponse: ITokenResponse }>(),
    'refresh token error': props<{ error: HttpErrorResponse }>(),
    logout: props<{ refreshToken: string }>(),
    'logout success': emptyProps(),
    'logout error': props<{ error: HttpErrorResponse }>(),
  },
});
