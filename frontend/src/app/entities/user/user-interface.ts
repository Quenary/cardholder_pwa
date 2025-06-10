export interface IUser {
  id: number;
  username: string;
  email: string;
}
export interface IUserCreate {
  username: string;
  email: string;
  password: string;
}
export interface IUserUpdate extends IUserCreate {}