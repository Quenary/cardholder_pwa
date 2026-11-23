import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../base/base-api.service';
import {
  ITwoFactorDisableResponse,
  ITwoFactorEnableResponse,
  ITwoFactorPasswordCode,
  ITwoFactorRecoveryCodesResponse,
  ITwoFactorSetup,
} from './two-factor-interface';

@Injectable({
  providedIn: 'root',
})
export class TwoFactorApiService extends BaseApiService<''> {
  protected override readonly prefix = '';

  setup(): Observable<ITwoFactorSetup> {
    return this.httpClient.post<ITwoFactorSetup>(
      `${this.basePath}/user/2fa/setup`,
      {},
    );
  }

  enable(body: ITwoFactorPasswordCode): Observable<ITwoFactorEnableResponse> {
    return this.httpClient.post<ITwoFactorEnableResponse>(
      `${this.basePath}/user/2fa/enable`,
      body,
    );
  }

  disable(body: ITwoFactorPasswordCode): Observable<ITwoFactorDisableResponse> {
    return this.httpClient.post<ITwoFactorDisableResponse>(
      `${this.basePath}/user/2fa/disable`,
      body,
    );
  }

  regenerateRecoveryCodes(
    body: ITwoFactorPasswordCode,
  ): Observable<ITwoFactorRecoveryCodesResponse> {
    return this.httpClient.post<ITwoFactorRecoveryCodesResponse>(
      `${this.basePath}/user/2fa/recovery-codes`,
      body,
    );
  }
}
