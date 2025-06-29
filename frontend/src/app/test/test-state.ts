import { IAuthState } from '../entities/auth/state/auth.reducers';
import { ICardsState } from '../entities/cards/state/cards.reducers';
import { IUserState } from '../entities/user/state/user.reducers';
import { EUserRole } from '../entities/user/user-interface';
import { IAppState } from '../state/app.reducers';

export interface ITestAppState {
  app: IAppState;
  user: IUserState;
  auth: IAuthState;
  cards: ICardsState;
}
export const testAppState: ITestAppState = {
  app: {
    isOnline: true,
    settings: [],
    version: null,
  },
  user: {
    info: {
      'id': 1,
      'username': 'testusername',
      'email': 'testemail@gmail.com',
      'created_at': '2025-06-15T22:58:01.072197',
      'updated_at': '2025-06-27T01:02:28.642472',
      'role_code': EUserRole.OWNER,
    },
    form: null,
    hasChanges: false,
    init: true,
    isLoading: false,
  },
  auth: {
    tokenResponse: {
      access_token: 'valid-access-token',
      token_type: 'bearer',
      expires_in: 899,
      refresh_token: 'valid-refresh-token',
    },
    init: true,
    isLoading: false,
  },
  cards: {
    list: [
      {
        'code': 'https://github.com/Quenary/cardholder_pwa',
        'code_type': 'qrcode',
        'name': 'Repo',
        'description': null,
        'color': '#d40c0c',
        'id': 1,
      },
      {
        'code': '0123456789012',
        'code_type': 'ean13',
        'name': 'test',
        'description': 'test desc\nnewline',
        'color': '#057eff',
        'id': 2,
      },
    ],
    active: null,
    isLoading: false,
  },
};
