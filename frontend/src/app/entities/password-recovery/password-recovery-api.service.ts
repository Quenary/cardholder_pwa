import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  IPasswordRecoveryCode,
  IPasswordRecoverySubmit,
} from './password-recovery-interface';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class PasswordRecoveryApiService {
  private readonly httpClient = inject(HttpClient);

  code(body: IPasswordRecoveryCode): Observable<any> {
    return this.httpClient.post(`${environment.api}/recovery/code`, body);
  }

  submit(body: IPasswordRecoverySubmit): Observable<any> {
    return this.httpClient.put(`${environment.api}/recovery/submit`, body);
  }
}
