import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ICard, ICardBase } from './cards-interface';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class CardApiService {
  constructor(private httpClient: HttpClient) {}

  create(body: ICardBase): Observable<ICard> {
    return this.httpClient.post<ICard>(`${environment.api}/cards`, body);
  }

  read(cardId: number): Observable<ICard> {
    return this.httpClient.get<ICard>(`${environment.api}/cards/${cardId}`);
  }

  update(cardId: number, body: ICardBase): Observable<ICard> {
    return this.httpClient.put<ICard>(
      `${environment.api}/cards/${cardId}`,
      body
    );
  }

  delete(cardId: number): Observable<string> {
    return this.httpClient.delete(`${environment.api}/cards/${cardId}`, {
      responseType: 'text',
      observe: 'body',
    });
  }

  list(): Observable<ICard[]> {
    return this.httpClient.get<ICard[]>(`${environment.api}/cards`);
  }
}
