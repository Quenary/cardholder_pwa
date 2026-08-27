import { Injectable } from '@angular/core';
import { ICard, ICardBase } from './cards-interface';
import { Observable } from 'rxjs';
import { BaseApiService } from '../base/base-api.service';
import { filenameFor } from 'src/app/shared/functions/filename-for.function';

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

  patch(id: number, body: Partial<ICardBase>): Observable<ICard> {
    return this.httpClient.patch<ICard>(`${this.basePath}/${id}`, body);
  }

  /**
   * Fetches a logo as a blob rather than letting the browser load it from a
   * URL: the endpoint is authenticated and a plain `<img src>` would not carry
   * the bearer token added by the interceptor.
   */
  getLogoBlob(cardId: number, updatedAt: string): Observable<Blob> {
    return this.httpClient.get(`${this.basePath}/${cardId}/logo`, {
      responseType: 'blob',
      // The logo URL is stable across replacements, so `updatedAt` is what
      // makes a replaced image a different URL for the browser and the
      // service worker.
      params: { updatedAt },
    });
  }

  uploadLogo(cardId: number, file: File): Observable<ICard> {
    const form = new FormData();
    // iOS WKWebView (installed PWA) often hands us a File with an empty name.
    // FormData then omits `filename=` from Content-Disposition, Starlette
    // treats the part as a regular form field, and FastAPI's
    // `UploadFile = File(...)` rejects the request with 422 before the
    // handler runs — which is why the server log is only the access line.
    form.append('file', file, filenameFor(file));
    return this.httpClient.post<ICard>(`${this.basePath}/${cardId}/logo`, form);
  }

  deleteLogo(cardId: number): Observable<ICard> {
    return this.httpClient.delete<ICard>(`${this.basePath}/${cardId}/logo`);
  }
}
