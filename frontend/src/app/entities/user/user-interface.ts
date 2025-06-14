export interface IUser {
  id: number;
  username: string;
  email: string;
}
export interface IUserCreate {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}
export interface IUserUpdate {
  username: string;
  email: string;
  password?: string;
  confirm_password?: string;
}
