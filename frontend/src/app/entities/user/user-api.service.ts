import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IOAuth2PasswordRequestForm } from '../auth/auth-interface';
import { Observable } from 'rxjs';
import { IUser } from './user-interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  constructor(private httpClient: HttpClient) {}

  create(body: IOAuth2PasswordRequestForm): Observable<IUser> {
    return this.httpClient.post<IUser>(`${environment.api}/user`, body);
  }

  read(): Observable<IUser> {
    return this.httpClient.get<IUser>(`${environment.api}/user`);
  }
}
