import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserComponent } from './user.component';
import { ITestAppState, testAppState, TestTranslateModule } from 'src/app/test';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { UserActions } from 'src/app/entities/user/state/user.actions';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };
    await TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState }), provideRouter([])],
      imports: [UserComponent, TestTranslateModule],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create', () => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should update username and email', () => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    const dispatchSpy = spyOn(storeMock, 'dispatch');
    fixture.detectChanges();

    const body = {
      username: 'user1',
      email: 'testemail1@example.com',
    };
    component.form.patchValue(body);
    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(UserActions.update({ body }));
  });

  it('should not update user on invalid form', () => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    const dispatchSpy = spyOn(storeMock, 'dispatch');
    fixture.detectChanges();

    // empty form
    component.form.reset();
    component.onSubmit();

    // invalid username
    component.form.patchValue({
      username: '1',
      email: 'testemail1@example.com',
    });
    component.onSubmit();

    // invalid email
    component.form.patchValue({
      username: 'user1',
      email: 'invalidemail',
    });
    component.onSubmit();

    expect(
      dispatchSpy.calls
        .all()
        .some((call) => (call.args[0] as any).type == UserActions.update.type),
    ).toBeFalse();
  });

  it('should update password if checked', () => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    const dispatchSpy = spyOn(storeMock, 'dispatch');
    fixture.detectChanges();

    component.onChangePasswordCheck({ checked: true, source: null });
    const body = {
      username: 'user1',
      email: 'testemail1@example.com',
      password: '12345678qQ',
      confirm_password: '12345678qQ',
    };
    component.form.patchValue(body);
    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(UserActions.update({ body }));
  });

  it('should not update password if unchecked', () => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    const dispatchSpy = spyOn(storeMock, 'dispatch');
    fixture.detectChanges();

    component.onChangePasswordCheck({ checked: true, source: null });
    const body = {
      username: 'user1',
      email: 'testemail1@example.com',
      password: '12345678qQ',
      confirm_password: '12345678qQ',
    };
    component.form.patchValue(body);
    component.onChangePasswordCheck({ checked: false, source: null });
    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      UserActions.update({
        body: { username: 'user1', email: 'testemail1@example.com' },
      }),
    );
  });
});
