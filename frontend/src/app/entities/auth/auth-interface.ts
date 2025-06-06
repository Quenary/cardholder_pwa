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
