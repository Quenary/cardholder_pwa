import { Injectable } from '@angular/core';
import {
  IPasswordRecoveryCode,
  IPasswordRecoverySubmit,
} from './password-recovery-interface';
import { Observable } from 'rxjs';
import { BaseApiService } from '../base/base-api.service';

@Injectable({
  providedIn: 'root',
})
export class PasswordRecoveryApiService extends BaseApiService<'recovery'> {
  protected override readonly prefix = 'recovery';

  code(body: IPasswordRecoveryCode): Observable<unknown> {
    return this.httpClient.post(`${this.basePath}/code`, body);
  }

  submit(body: IPasswordRecoverySubmit): Observable<unknown> {
    return this.httpClient.put(`${this.basePath}/submit`, body);
  }
}
