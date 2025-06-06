import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IOAuth2PasswordRequestForm, ITokenResponse } from './auth-interface';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  constructor(private httpClient: HttpClient) {}

  token(body: IOAuth2PasswordRequestForm): Observable<ITokenResponse> {
    return this.httpClient.post<ITokenResponse>(
      `${environment.api}/token`,
      body
    );
  }

  tokenRefresh(refreshToken: string): Observable<ITokenResponse> {
    return this.httpClient.post<ITokenResponse>(
      `${environment.api}/token/refresh`,
      {},
      {
        params: {
          refreshToken,
        },
      }
    );
  }

  logout(refreshToken: string): Observable<string> {
    return this.httpClient.post(
      `${environment.api}/logout`,
      {},
      {
        params: {
          refreshToken,
        },
        observe: 'body',
        responseType: 'text',
      }
    );
  }

  
}
