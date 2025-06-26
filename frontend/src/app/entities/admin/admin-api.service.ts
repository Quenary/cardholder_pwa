import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EUserRole, IUser } from '../user/user-interface';
import { ISetting, ISettingUpdate } from './admin-interface';
import { BaseApiService } from '../base/base-api.service';

@Injectable({
  providedIn: 'root',
})
export class AdminApiService extends BaseApiService<'admin'> {
  protected override readonly prefix = 'admin';

  usersList(): Observable<IUser[]> {
    return this.httpClient.get<IUser[]>(`${this.basePath}/users`);
  }

  deleteUser(user_id: number): Observable<any> {
    return this.httpClient.delete(`${this.basePath}/users/${user_id}`);
  }

  changeUserRole(user_id: number, role_code: EUserRole): Observable<any> {
    return this.httpClient.put(
      `${this.basePath}/users/role`,
      {},
      {
        params: {
          user_id,
          role_code,
        },
      },
    );
  }

  getSettings(): Observable<ISetting[]> {
    return this.httpClient.get<ISetting[]>(`${this.basePath}/settings`);
  }

  setSettings(settings: ISettingUpdate[]): Observable<any> {
    return this.httpClient.patch(`${this.basePath}/settings`, settings);
  }

  smtpStatus(): Observable<boolean> {
    return this.httpClient.get<boolean>(`${this.basePath}/smtp/status`);
  }

  smtpTest(): Observable<any> {
    return this.httpClient.post(`${this.basePath}/smtp/test`, {});
  }
}
