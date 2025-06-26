import { Injectable } from '@angular/core';
import { IOAuth2PasswordRequestForm, ITokenResponse } from './auth-interface';
import { Observable } from 'rxjs';
import { BaseApiService } from '../base/base-api.service';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService extends BaseApiService<''> {
  protected override readonly prefix = '';

  token(body: IOAuth2PasswordRequestForm): Observable<ITokenResponse> {
    const formData = new FormData();
    formData.append('grant_type', body.grant_type);
    formData.append('username', body.username);
    formData.append('password', body.password);
    return this.httpClient.post<ITokenResponse>(
      `${this.basePath}/token`,
      formData,
    );
  }

  tokenRefresh(refresh_token: string): Observable<ITokenResponse> {
    return this.httpClient.post<ITokenResponse>(
      `${this.basePath}/token/refresh`,
      { refresh_token },
    );
  }

  logout(refresh_token: string): Observable<string> {
    return this.httpClient.post(
      `${this.basePath}/logout`,
      { refresh_token },
      {
        observe: 'body',
        responseType: 'text',
      },
    );
  }
}
