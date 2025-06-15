export interface ICardBase {
  code: string;
  code_type: string;
  name: string;
  description: string;
  color: string;
}
export interface ICard extends ICardBase {
  id: number;
}
