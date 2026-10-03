import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { provideRouter } from '@angular/router';
import { UserApiService } from 'src/app/entities/user/user-api.service';
import { Mocked } from 'vitest';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { Component } from '@angular/core';

@Component({})
class DummyComponent {}

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  let userApiServiceMock: Partial<Mocked<UserApiService>>;

  beforeEach(async () => {
    userApiServiceMock = {
      create: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([
          {
            path: 'auth',
            component: DummyComponent,
          },
        ]),
        provideTranslateService(),
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

  describe('onSubmit', () => {
    it('calls create when valid', () => {
      fixture = TestBed.createComponent(RegisterComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component['form'].patchValue({
        username: 'user1',
        email: 'testemail@google.com',
        password: '123456Qq',
        confirm_password: '123456Qq',
      });
      fixture.detectChanges();

      component['onSubmit']();

      expect(userApiServiceMock.create).toHaveBeenCalledTimes(1);
    });

    it('does not call create when invalid', () => {
      fixture = TestBed.createComponent(RegisterComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component['form'].patchValue({});
      component['onSubmit']();

      component['form'].patchValue({
        username: 'user1',
        email: 'testemail@google.com',
        password: '123456Qq',
        confirm_password: '1234',
      });
      component['onSubmit']();

      component['form'].patchValue({
        username: '1',
        email: 'testemail@google.com',
        password: '123456Qq',
        confirm_password: '123456Qq',
      });
      component['onSubmit']();

      component['form'].patchValue({
        username: 'user1',
        email: 'invalidemail',
        password: '123456Qq',
        confirm_password: '123456Qq',
      });
      component['onSubmit']();

      expect(userApiServiceMock.create).toHaveBeenCalledTimes(0);
    });
  });
});
