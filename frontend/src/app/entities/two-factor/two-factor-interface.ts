import { ITokenResponse } from '../auth/auth-interface';

export interface ITwoFactorSetup {
  secret: string;
  otpauth_uri: string;
}

export interface ITwoFactorPasswordCode {
  password: string;
  code: string;
}

export interface ITwoFactorEnableResponse {
  recovery_codes: string[];
  tokens: ITokenResponse | null;
}

export interface ITwoFactorDisableResponse {
  tokens: ITokenResponse | null;
}

export interface ITwoFactorRecoveryCodesResponse {
  recovery_codes: string[];
}
