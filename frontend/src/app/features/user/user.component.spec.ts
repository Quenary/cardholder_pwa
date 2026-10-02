import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserComponent } from './user.component';
import { ITestAppState, testAppState } from 'src/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { provideTranslateService } from '@ngx-translate/core';

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
});
