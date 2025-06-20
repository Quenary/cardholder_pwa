import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IUser } from '../user/user-interface';
import { environment } from '@env/environment';
import { ISetting, ISettingUpdate } from './admin-interface';

@Injectable({
  providedIn: 'root',
})
export class AdminApiService {
  private readonly httpClient = inject(HttpClient);

  usersList(): Observable<IUser[]> {
    return this.httpClient.get<IUser[]>(`${environment.api}/admin/users`);
  }

  deleteUser(user_id: number): Observable<any> {
    return this.httpClient.delete(`${environment.api}/admin/users/${user_id}`);
  }

  getSettings(): Observable<ISetting[]> {
    return this.httpClient.get<ISetting[]>(`${environment.api}/admin/settings`);
  }

  setSettings(settings: ISettingUpdate[]): Observable<any> {
    return this.httpClient.patch(`${environment.api}/admin/settings`, settings);
  }
}
