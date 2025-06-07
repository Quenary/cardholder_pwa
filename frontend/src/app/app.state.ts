import { IAuthState } from './entities/auth/state/auth.reducers';

export const baseActionPrefix: string = '[CARDHOLDER]';
export interface IAppState {
  auth: IAuthState;
}
