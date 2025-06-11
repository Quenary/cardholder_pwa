export interface IPasswordRecoveryCode {
  email: string;
}
export interface IPasswordRecoverySubmit {
  code: string;
  password: string;
}
