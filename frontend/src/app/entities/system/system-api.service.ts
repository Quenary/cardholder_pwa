import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IVersion } from './system-interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class SystemApiService {
  constructor(private readonly httpClient: HttpClient) {}

  version(): Observable<IVersion> {
    return this.httpClient.get<IVersion>(`${environment.api}/system/version`);
  }

  smtpStatus(): Observable<boolean> {
    return this.httpClient.get<boolean>(
      `${environment.api}/system/smtp/status`
    );
  }

  smtpTest(): Observable<any> {
    return this.httpClient.post(`${environment.api}/system/smtp/test`, {});
  }
}
