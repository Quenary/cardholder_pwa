import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { TwoFactorApiService } from 'src/app/entities/two-factor/two-factor-api.service';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { testAppState } from 'src/testing';
import {
  ITwoFactorConfirmDialogData,
  TwoFactorConfirmDialogComponent,
} from './two-factor-confirm-dialog.component';

const TOKENS = {
  access_token: 'access',
  token_type: 'bearer',
  expires_in: 300,
  refresh_token: 'refresh',
};

describe('TwoFactorConfirmDialogComponent', () => {
  let store: MockStore;
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let api: {
    disable: ReturnType<typeof vi.fn>;
    regenerateRecoveryCodes: ReturnType<typeof vi.fn>;
  };

  const setup = (action: ITwoFactorConfirmDialogData['action']) => {
    dialogRef = { close: vi.fn(), disableClose: false };
    api = {
      disable: vi.fn(() => of({ tokens: TOKENS })),
      regenerateRecoveryCodes: vi.fn(() =>
        of({ recovery_codes: ['AAAAA-BBBBB'] }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [TwoFactorConfirmDialogComponent],
      providers: [
        provideMockStore({ initialState: testAppState }),
        provideTranslateService(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { action } },
        {
          provide: SnackService,
          useValue: { success: vi.fn(), error: vi.fn() },
        },
        { provide: TwoFactorApiService, useValue: api },
      ],
    });
    store = TestBed.inject(MockStore);
    const fixture = TestBed.createComponent(TwoFactorConfirmDialogComponent);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('disables two-factor authentication', () => {
    const fixture = setup('disable');
    const dispatch = vi.spyOn(store, 'dispatch');
    fixture.componentInstance['form'].patchValue({
      password: 'secret12',
      code: '123456',
    });
    fixture.componentInstance['confirm']();
    expect(api.disable).toHaveBeenCalledWith({
      password: 'secret12',
      code: '123456',
    });
    expect(dispatch).toHaveBeenCalledWith(
      AuthActions.tokensReplaced({ tokenResponse: TOKENS }),
    );
    expect(dispatch).toHaveBeenCalledWith(UserActions.read());
    expect(dialogRef.close).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'USER.TWO_FACTOR.CONFIRM_DISABLE_TITLE',
    );
  });

  it('regenerates recovery codes', () => {
    const fixture = setup('regenerate');
    const dispatch = vi.spyOn(store, 'dispatch');
    fixture.componentInstance['form'].patchValue({
      password: 'secret12',
      code: 'AAAAA-BBBBB',
    });
    fixture.componentInstance['confirm']();
    fixture.detectChanges();
    expect(api.regenerateRecoveryCodes).toHaveBeenCalledWith({
      password: 'secret12',
      code: 'AAAAA-BBBBB',
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('AAAAA-BBBBB');
    expect(fixture.nativeElement.textContent).toContain(
      'USER.TWO_FACTOR.CONFIRM_REGENERATE_TITLE',
    );
  });
});
