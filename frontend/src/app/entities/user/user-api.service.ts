import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IUserCreate, IUser, IUserUpdate } from './user-interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  constructor(private httpClient: HttpClient) {}

  create(body: IUserCreate): Observable<IUser> {
    return this.httpClient.post<IUser>(`${environment.api}/user`, body);
  }

  read(): Observable<IUser> {
    return this.httpClient.get<IUser>(`${environment.api}/user`);
  }

  update(body: IUserUpdate): Observable<IUser> {
    return this.httpClient.put<IUser>(`${environment.api}/user`, body);
  }

  delete(): Observable<any> {
    return this.httpClient.delete(`${environment.api}/user`);
  }
}
