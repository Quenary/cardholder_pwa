import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IPublicSettingsItem, IVersion } from './public-interface';
import { BaseApiService } from '../base/base-api.service';

@Injectable({
  providedIn: 'root',
})
export class PublicApiService extends BaseApiService<'public'> {
  protected override readonly prefix = 'public';

  version(): Observable<IVersion> {
    return this.httpClient.get<IVersion>(`${this.basePath}/version`);
  }

  health(): Observable<any> {
    return this.httpClient.get(`${this.basePath}/health`);
  }

  settings(): Observable<IPublicSettingsItem[]> {
    return this.httpClient.get<IPublicSettingsItem[]>(
      `${this.basePath}/settings`,
    );
  }
}
