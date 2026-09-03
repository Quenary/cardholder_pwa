import { ICard } from 'src/app/entities/cards/cards-interface';

export interface IShareUser {
  id: number;
  username: string;
}

export interface ISharedCardItem {
  card: ICard;
  shared_with_users: IShareUser[];
}

export interface ISharedWithMeItem {
  card: ICard;
  owner: IShareUser;
}

export interface ISharedCardsResponse {
  you_share: ISharedCardItem[];
  shared_with_you: ISharedWithMeItem[];
}

export interface IShareCardRequest {
  card_id: number;
  user_ids: number[];
}

export interface IUpdateCardShareRequest {
  user_ids: number[];
}

export interface IShareAllCardsRequest {
  user_ids: number[];
}
