export interface IOAuth2PasswordRequestForm {
  grant_type: 'password';
  username: string;
  password: string;
}
export interface ITokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface ITwoFactorChallenge {
  two_factor_required: true;
  challenge_token: string;
  expires_in: number;
}

export interface ITokenTwoFactorRequest {
  challenge_token: string;
  code: string;
}

export const isTwoFactorChallenge = (
  response: ITokenResponse | ITwoFactorChallenge,
): response is ITwoFactorChallenge =>
  (response as ITwoFactorChallenge).two_factor_required === true;
