import { TypeToString } from 'src/app/shared/types/type-to-string';

export interface ICardBase {
  code: string;
  code_type: string;
  name: string;
  description: string;
  color: string;
  is_favorite?: boolean;
  used_at?: string;
}
export interface ICard extends ICardBase {
  id: number;
  created_at: string;
  updated_at: string;
}
export const ECardFieldType: { [K in keyof ICard]: TypeToString<ICard[K]> } = {
  id: 'number',
  code: 'string',
  code_type: 'string',
  name: 'string',
  description: 'string',
  color: 'string',
  is_favorite: 'boolean',
  used_at: 'date',
  created_at: 'date',
  updated_at: 'date',
};
