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
    const formData = new FormData();
    formData.append('grant_type', body.grant_type);
    formData.append('username', body.username);
    formData.append('password', body.password);
    return this.httpClient.post<ITokenResponse>(
      `${environment.api}/token`,
      formData
    );
  }

  tokenRefresh(refresh_token: string): Observable<ITokenResponse> {
    return this.httpClient.post<ITokenResponse>(
      `${environment.api}/token/refresh`,
      {},
      {
        params: {
          refresh_token,
        },
      }
    );
  }

  logout(refresh_token: string): Observable<string> {
    return this.httpClient.post(
      `${environment.api}/logout`,
      {},
      {
        params: {
          refresh_token,
        },
        observe: 'body',
        responseType: 'text',
      }
    );
  }
}
