import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserComponent } from './user.component';
import { ITestAppState, testAppState } from 'src/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { provideTranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { EPublicSettingKey } from 'src/app/entities/public/public-interface';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };
    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([]),
        provideTranslateService(),
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
      imports: [UserComponent],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create', () => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('onSubmit', () => {
    describe('profile', () => {
      it('dispatches update when valid', () => {
        fixture = TestBed.createComponent(UserComponent);
        component = fixture.componentInstance;
        const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
        fixture.detectChanges();

        const body = {
          username: 'user1',
          email: 'testemail1@example.com',
          current_password: 'currentPass1',
        };
        component['form'].patchValue(body);
        component['onSubmit']();

        expect(dispatchSpy).toHaveBeenCalledWith(UserActions.update({ body }));
      });

      it('skips email change without current password', () => {
        fixture = TestBed.createComponent(UserComponent);
        component = fixture.componentInstance;
        const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
        fixture.detectChanges();

        component['form'].patchValue({
          username: 'user1',
          email: 'testemail1@example.com',
        });
        component['onSubmit']();

        expect(dispatchSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({ type: UserActions.update.type }),
        );
      });

      it('does not require password for username-only edit', () => {
        fixture = TestBed.createComponent(UserComponent);
        component = fixture.componentInstance;
        const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
        fixture.detectChanges();

        const body = {
          username: 'user1',
          email: 'testemail@gmail.com',
        };
        component['form'].patchValue(body);
        component['onSubmit']();

        expect(component['needsCurrentPassword']()).toBe(false);
        expect(dispatchSpy).toHaveBeenCalledWith(UserActions.update({ body }));
      });

      it('does not dispatch when invalid', () => {
        fixture = TestBed.createComponent(UserComponent);
        component = fixture.componentInstance;
        const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
        fixture.detectChanges();

        component['form'].reset();
        component['onSubmit']();

        component['form'].patchValue({
          username: '1',
          email: 'testemail1@example.com',
        });
        component['onSubmit']();

        component['form'].patchValue({
          username: 'user1',
          email: 'invalidemail',
        });
        component['onSubmit']();

        expect(dispatchSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({ type: UserActions.update.type }),
        );
      });
    });

    describe('password change', () => {
      it('includes password when checked', () => {
        fixture = TestBed.createComponent(UserComponent);
        component = fixture.componentInstance;
        const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
        fixture.detectChanges();

        component['onChangePasswordCheck']({ checked: true, source: null });
        const body = {
          username: 'user1',
          email: 'testemail1@example.com',
          current_password: 'currentPass1',
          password: '12345678qQ',
          confirm_password: '12345678qQ',
        };
        component['form'].patchValue(body);
        component['onSubmit']();

        expect(dispatchSpy).toHaveBeenCalledWith(UserActions.update({ body }));
      });

      it('requires current password', () => {
        fixture = TestBed.createComponent(UserComponent);
        component = fixture.componentInstance;
        const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
        fixture.detectChanges();

        component['onChangePasswordCheck']({ checked: true, source: null });
        component['form'].patchValue({
          username: 'testusername',
          email: 'testemail@gmail.com',
          password: '12345678qQ',
          confirm_password: '12345678qQ',
        });
        component['onSubmit']();

        expect(component['needsCurrentPassword']()).toBe(true);
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({ type: UserActions.update.type }),
        );
      });

      it('omits password when unchecked', () => {
        fixture = TestBed.createComponent(UserComponent);
        component = fixture.componentInstance;
        const dispatchSpy = vi.spyOn(storeMock, 'dispatch');
        fixture.detectChanges();

        component['onChangePasswordCheck']({ checked: true, source: null });
        const body = {
          username: 'user1',
          email: 'testemail1@example.com',
          current_password: 'currentPass1',
          password: '12345678qQ',
          confirm_password: '12345678qQ',
        };
        component['form'].patchValue(body);
        component['onChangePasswordCheck']({ checked: false, source: null });
        component['onSubmit']();

        expect(dispatchSpy).toHaveBeenCalledWith(
          UserActions.update({
            body: {
              username: 'user1',
              email: 'testemail1@example.com',
              current_password: 'currentPass1',
            },
          }),
        );
      });
    });
  });

  describe('two-factor section', () => {
    const render = (enabled: boolean, available: boolean): HTMLElement => {
      storeMock.setState({
        ...initialState,
        user: {
          ...initialState.user,
          info: {
            ...initialState.user.info,
            two_factor_enabled: enabled,
          },
        },
        app: {
          ...initialState.app,
          settings: available
            ? [{ key: EPublicSettingKey.TWO_FACTOR_AVAILABLE, value: true }]
            : [],
        },
      });
      fixture = TestBed.createComponent(UserComponent);
      fixture.detectChanges();
      return fixture.nativeElement;
    };

    it('offers enable when two-factor is off and the server allows it', () => {
      const root = render(false, true);
      const enable = [...root.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('USER.TWO_FACTOR.ENABLE'),
      );
      expect(enable).toBeTruthy();
      expect(enable.disabled).toBe(false);
      expect(root.textContent).not.toContain('USER.TWO_FACTOR.UNAVAILABLE');
    });

    it('disables enable and explains why when two-factor is unavailable', () => {
      const root = render(false, false);
      const enable = [...root.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('USER.TWO_FACTOR.ENABLE'),
      );
      expect(enable.disabled).toBe(true);
      expect(root.textContent).toContain('USER.TWO_FACTOR.UNAVAILABLE');
    });

    it('offers regenerate and disable when two-factor is on', () => {
      const root = render(true, true);
      expect(root.textContent).toContain('USER.TWO_FACTOR.REGENERATE');
      expect(root.textContent).toContain('USER.TWO_FACTOR.DISABLE');
      expect(root.textContent).not.toContain('USER.TWO_FACTOR.ENABLE');
    });
  });
});
