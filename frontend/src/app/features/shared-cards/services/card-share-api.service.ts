import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from 'src/app/entities/base/base-api.service';
import {
  IShareAllCardsRequest,
  IShareCardRequest,
  ISharedCardItem,
  ISharedCardsResponse,
  ISharedWithMeItem,
  IShareUsersPage,
  IUpdateCardShareRequest,
} from '../shared-cards.interface';

@Injectable({
  providedIn: 'root',
})
export class CardShareApiService extends BaseApiService<'cards/share'> {
  protected override readonly prefix = 'cards/share';

  getSharedCards(): Observable<ISharedCardsResponse> {
    return this.httpClient.get<ISharedCardsResponse>(`${this.basePath}`);
  }

  getAvailableUsers(
    limit: number,
    offset: number,
  ): Observable<IShareUsersPage> {
    return this.httpClient.get<IShareUsersPage>(`${this.basePath}/users`, {
      params: { limit, offset },
    });
  }

  getCardsSharedWithMe(): Observable<ISharedWithMeItem[]> {
    return this.httpClient.get<ISharedWithMeItem[]>(`${this.basePath}/with-me`);
  }

  shareCard(body: IShareCardRequest): Observable<ISharedCardItem> {
    return this.httpClient.post<ISharedCardItem>(`${this.basePath}`, body);
  }

  updateCardShare(
    cardId: number,
    body: IUpdateCardShareRequest,
  ): Observable<ISharedCardItem> {
    return this.httpClient.put<ISharedCardItem>(
      `${this.basePath}/${cardId}`,
      body,
    );
  }

  shareAllCards(body: IShareAllCardsRequest): Observable<{ detail: string }> {
    return this.httpClient.post<{ detail: string }>(
      `${this.basePath}/all`,
      body,
    );
  }

  deleteCardShare(cardId: number): Observable<{ detail: string }> {
    return this.httpClient.delete<{ detail: string }>(
      `${this.basePath}/${cardId}`,
    );
  }

  deleteCardSharedWithMe(cardId: number): Observable<{ detail: string }> {
    return this.httpClient.delete<{ detail: string }>(
      `${this.basePath}/with-me/${cardId}`,
    );
  }
}
