import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { TestTranslateModule } from 'src/app/test';
import { provideRouter } from '@angular/router';
import { UserApiService } from 'src/app/entities/user/user-api.service';
import { of } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  let userApiServiceMock: jasmine.SpyObj<UserApiService>;

  beforeEach(async () => {
    userApiServiceMock = jasmine.createSpyObj<UserApiService>(
      'UserApiService',
      ['create'],
    );
    userApiServiceMock.create.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, TestTranslateModule],
      providers: [
        provideRouter([]),
        {
          provide: UserApiService,
          useValue: userApiServiceMock,
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should create user', () => {
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({
      username: 'user1',
      email: 'testemail@google.com',
      password: '123456Qq',
      confirm_password: '123456Qq',
    });

    component.onSubmit();

    expect(userApiServiceMock.create).toHaveBeenCalledTimes(1);
  });

  it('should not create user on invalid form', () => {
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // empty form
    component.form.patchValue({});
    component.onSubmit();

    // passwords does not match
    component.form.patchValue({
      username: 'user1',
      email: 'testemail@google.com',
      password: '123456Qq',
      confirm_password: '1234',
    });
    component.onSubmit();

    // invalid username
    component.form.patchValue({
      username: '1',
      email: 'testemail@google.com',
      password: '123456Qq',
      confirm_password: '123456Qq',
    });
    component.onSubmit();

    // invalid email
    component.form.patchValue({
      username: 'user1',
      email: 'invalidemail',
      password: '123456Qq',
      confirm_password: '123456Qq',
    });
    component.onSubmit();

    expect(userApiServiceMock.create).toHaveBeenCalledTimes(0);
  });
});
