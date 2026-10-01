import { ICard } from 'src/app/entities/cards/cards-interface';

export interface IShareUser {
  id: number;
  username: string;
}

/**
 * What the recipient decided about a share. A share is pending until they
 * answer, and only an accepted one is in their list of cards.
 */
export type TShareStatus = 'pending' | 'accepted' | 'declined';

export interface IShareRecipient extends IShareUser {
  status: TShareStatus;
}

export interface IShareUsersPage {
  items: IShareUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface ISharedCardItem {
  card: ICard;
  shared_with_users: IShareRecipient[];
}

export interface ISharedWithMeItem {
  card: ICard;
  owner: IShareUser;
  status: TShareStatus;
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
