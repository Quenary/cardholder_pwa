import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState } from 'src/testing';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { provideTranslateService } from '@ngx-translate/core';
import { SnackService } from 'src/app/core/services/snack.service';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };

    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([]),
        provideTranslateService(),
        { provide: SnackService, useValue: { error: vi.fn() } },
      ],
      imports: [AuthComponent],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create', () => {
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('onSubmit', () => {
    it('dispatches token action', () => {
      fixture = TestBed.createComponent(AuthComponent);
      component = fixture.componentInstance;
      const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
      fixture.detectChanges();

      const formData = {
        username: 'somelogin',
        password: 'somepassword',
      };
      component['form'].patchValue(formData);
      component['onSubmit']();
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        AuthActions.token({
          body: {
            ...formData,
            grant_type: 'password',
          },
        }),
      );
    });
  });

  describe('two-factor step', () => {
    const showStep = () => {
      storeMock.setState({
        ...initialState,
        auth: {
          ...initialState.auth,
          twoFactorChallenge: {
            token: 'challenge-token',
            expiresAt: Date.now() + 60_000,
          },
        },
      });
      fixture = TestBed.createComponent(AuthComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('renders the code form when a challenge exists', () => {
      showStep();
      expect(fixture.nativeElement.textContent).toContain(
        'AUTH.TWO_FACTOR.TITLE',
      );
      expect(fixture.nativeElement.textContent).not.toContain('AUTH.SIGNIN');
    });

    it('goes back to the password form', () => {
      showStep();
      const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
      const back = [...fixture.nativeElement.querySelectorAll('button')].find(
        (button: HTMLButtonElement) =>
          button.textContent?.includes('AUTH.TWO_FACTOR.BACK'),
      );
      back.click();
      expect(dispatchSpy).toHaveBeenCalledWith(
        AuthActions.tokenTwoFactorCancel(),
      );
    });

    it('submits the code', () => {
      showStep();
      const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
      component['codeForm'].patchValue({ code: '123456' });
      component['onVerify']();
      expect(dispatchSpy).toHaveBeenCalledWith(
        AuthActions.tokenTwoFactor({ code: '123456' }),
      );
    });
  });
});
