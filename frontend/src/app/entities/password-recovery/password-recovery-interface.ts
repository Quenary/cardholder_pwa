export interface IPasswordRecoveryCode {
  email: string;
}
export interface IPasswordRecoverySubmit {
  code: string;
  password: string;
  confirm_password: string;
}
