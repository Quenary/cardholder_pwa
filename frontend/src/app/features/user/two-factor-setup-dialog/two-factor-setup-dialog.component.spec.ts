import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { TwoFactorApiService } from 'src/app/entities/two-factor/two-factor-api.service';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { testAppState } from 'src/testing';
import { TwoFactorSetupDialogComponent } from './two-factor-setup-dialog.component';

vi.mock('@bwip-js/browser', () => ({
  default: { toCanvas: vi.fn() },
}));

const SETUP = { secret: 'ABCD1234EFGH', otpauth_uri: 'otpauth://totp/x' };
const TOKENS = {
  access_token: 'access',
  token_type: 'bearer',
  expires_in: 300,
  refresh_token: 'refresh',
};

describe('TwoFactorSetupDialogComponent', () => {
  let fixture: ComponentFixture<TwoFactorSetupDialogComponent>;
  let store: MockStore;
  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let api: {
    setup: ReturnType<typeof vi.fn>;
    enable: ReturnType<typeof vi.fn>;
  };
  let snack: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    clipboard = { copy: vi.fn() };
    api = {
      setup: vi.fn(() => of(SETUP)),
      enable: vi.fn(() =>
        of({
          recovery_codes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'],
          tokens: TOKENS,
        }),
      ),
    };
    snack = { success: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [TwoFactorSetupDialogComponent],
      providers: [
        provideMockStore({ initialState: testAppState }),
        provideTranslateService(),
        {
          provide: MatDialogRef,
          useValue: { close: vi.fn(), disableClose: false },
        },
        { provide: Clipboard, useValue: clipboard },
        { provide: SnackService, useValue: snack },
        { provide: TwoFactorApiService, useValue: api },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('asks for a secret when it opens', () => {
    fixture = TestBed.createComponent(TwoFactorSetupDialogComponent);
    fixture.detectChanges();
    expect(api.setup).toHaveBeenCalled();
  });

  it('shows the QR code and copies the raw secret', () => {
    fixture = TestBed.createComponent(TwoFactorSetupDialogComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-qr-code')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('ABCD 1234 EFGH');
    const copy = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) =>
        button.textContent?.includes('USER.TWO_FACTOR.COPY'),
    );
    copy.click();
    expect(clipboard.copy).toHaveBeenCalledWith('ABCD1234EFGH');
  });

  it('enables with the password and the code', () => {
    fixture = TestBed.createComponent(TwoFactorSetupDialogComponent);
    fixture.detectChanges();
    const dispatch = vi.spyOn(store, 'dispatch');
    fixture.componentInstance['form'].patchValue({
      password: 'secret12',
      code: '123456',
    });
    fixture.componentInstance['enable']();
    fixture.detectChanges();
    expect(api.enable).toHaveBeenCalledWith({
      password: 'secret12',
      code: '123456',
    });
    expect(dispatch).toHaveBeenCalledWith(
      AuthActions.tokensReplaced({ tokenResponse: TOKENS }),
    );
    expect(dispatch).toHaveBeenCalledWith(UserActions.read());
    expect(fixture.nativeElement.textContent).toContain('AAAAA-BBBBB');
  });

  it('accepts an authenticator code that contains a space', () => {
    fixture = TestBed.createComponent(TwoFactorSetupDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({
      password: 'secret12',
      code: '123 456',
    });
    expect(fixture.componentInstance['form'].valid).toBe(true);
  });

  it('shows the codes and keeps Done off until they are saved', () => {
    fixture = TestBed.createComponent(TwoFactorSetupDialogComponent);
    fixture.componentInstance['codes'].set(['AAAAA-BBBBB', 'CCCCC-DDDDD']);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('AAAAA-BBBBB');
    const done = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) =>
        button.textContent?.includes('USER.TWO_FACTOR.DONE'),
    );
    expect(done.disabled).toBe(true);
    fixture.nativeElement.querySelector('input[type="checkbox"]').click();
    fixture.detectChanges();
    expect(done.disabled).toBe(false);
  });

  it('reports a failed setup', () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: { detail: 'no' },
    });
    api.setup.mockReturnValue(throwError(() => error));
    fixture = TestBed.createComponent(TwoFactorSetupDialogComponent);
    fixture.detectChanges();
    expect(snack.error).toHaveBeenCalledWith(error);
  });
});
