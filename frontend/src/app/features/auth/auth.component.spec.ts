import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ITestAppState, testAppState, TestTranslateModule } from 'src/app/test';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };

    await TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState }), provideRouter([])],
      imports: [AuthComponent, TestTranslateModule],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create', () => {
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should sign-in', () => {
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    const dispatchSpy = spyOn(storeMock, 'dispatch');
    fixture.detectChanges();

    const formData = {
      username: 'somelogin',
      password: 'somepassword',
    };
    component.form.patchValue(formData);
    component.onSubmit();
    expect(dispatchSpy).toHaveBeenCalledOnceWith(
      AuthActions.token({
        body: {
          ...formData,
          grant_type: 'password',
        },
      }),
    );
  });
});
