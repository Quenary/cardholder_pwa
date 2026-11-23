import { HttpErrorResponse } from '@angular/common/http';
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  IOAuth2PasswordRequestForm,
  ITokenResponse,
  ITwoFactorChallenge,
} from 'src/app/entities/auth/auth-interface';

export const AuthActions = createActionGroup({
  source: '[AUTH]',
  events: {
    init: props<{ tokenResponse: ITokenResponse }>(),
    token: props<{ body: IOAuth2PasswordRequestForm }>(),
    'token success': props<{ tokenResponse: ITokenResponse }>(),
    'token error': props<{ error: HttpErrorResponse }>(),
    'token two factor required': props<{ challenge: ITwoFactorChallenge }>(),
    'token two factor': props<{ code: string }>(),
    'token two factor error': props<{ error: HttpErrorResponse }>(),
    'token two factor cancel': emptyProps(),
    /**
     * A new pair for the session that just enabled or disabled 2FA.
     * The user is already on a page, so this does not navigate.
     */
    'tokens replaced': props<{ tokenResponse: ITokenResponse }>(),
    'refresh token': props<{ refreshToken: string }>(),
    'refresh token success': props<{ tokenResponse: ITokenResponse }>(),
    'refresh token error': props<{ error: HttpErrorResponse }>(),
    /**
     * Tokens written by another tab, picked up from the storage event
     */
    'tokens synced': props<{ tokenResponse: ITokenResponse }>(),
    logout: emptyProps(),
    'logout success': emptyProps(),
    'logout error': props<{ error: HttpErrorResponse }>(),
    /**
     * Logout without api call on user deletion
     */
    'logout silent': emptyProps(),
  },
});
