export interface ICardBase {
  code: string;
  code_type: string;
  name: string;
  description: string;
}
export interface ICard extends ICardBase {
  id: number;
}
