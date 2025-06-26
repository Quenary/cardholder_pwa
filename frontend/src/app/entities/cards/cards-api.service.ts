import { Injectable } from '@angular/core';
import { ICard, ICardBase } from './cards-interface';
import { Observable } from 'rxjs';
import { BaseApiService } from '../base/base-api.service';

@Injectable({
  providedIn: 'root',
})
export class CardApiService extends BaseApiService<'cards'> {
  protected override readonly prefix = 'cards';

  create(body: ICardBase): Observable<ICard> {
    return this.httpClient.post<ICard>(`${this.basePath}`, body);
  }

  read(cardId: number): Observable<ICard> {
    return this.httpClient.get<ICard>(`${this.basePath}/${cardId}`);
  }

  update(cardId: number, body: ICardBase): Observable<ICard> {
    return this.httpClient.put<ICard>(`${this.basePath}/${cardId}`, body);
  }

  delete(cardId: number): Observable<string> {
    return this.httpClient.delete(`${this.basePath}/${cardId}`, {
      responseType: 'text',
      observe: 'body',
    });
  }

  list(): Observable<ICard[]> {
    return this.httpClient.get<ICard[]>(`${this.basePath}`);
  }
}
