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
