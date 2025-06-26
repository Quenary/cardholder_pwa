import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IVersion } from './public-interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class PublicApiService {
  constructor(private readonly httpClient: HttpClient) {}

  version(): Observable<IVersion> {
    return this.httpClient.get<IVersion>(`${environment.api}/public/version`);
  }

  health(): Observable<any> {
    return this.httpClient.get(`${environment.api}/public/health`);
  }
}
