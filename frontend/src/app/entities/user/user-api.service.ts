import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IUserCreate, IUser, IUserUpdate } from './user-interface';
import { BaseApiService } from '../base/base-api.service';

@Injectable({
  providedIn: 'root',
})
export class UserApiService extends BaseApiService<'user'> {
  protected override readonly prefix = 'user';

  create(body: IUserCreate): Observable<IUser> {
    return this.httpClient.post<IUser>(this.basePath, body);
  }

  read(): Observable<IUser> {
    return this.httpClient.get<IUser>(this.basePath);
  }

  update(body: IUserUpdate): Observable<IUser> {
    return this.httpClient.put<IUser>(this.basePath, body);
  }

  delete(): Observable<any> {
    return this.httpClient.delete(this.basePath);
  }
}
