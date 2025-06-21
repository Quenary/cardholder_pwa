export interface IUser {
  id: number;
  username: string;
  email: string;
  role_code: EUserRole;
  created_at: string;
  updated_at: string;
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
export enum EUserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}
