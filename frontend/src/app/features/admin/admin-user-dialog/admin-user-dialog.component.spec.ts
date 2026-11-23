import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import { EUserRole, IUser } from 'src/app/entities/user/user-interface';
import { ITestAppState, testAppState } from 'src/testing';
import { AdminUserDialogComponent } from './admin-user-dialog.component';

const user = (overrides: Partial<IUser> = {}): IUser => ({
  ...testAppState.user.info,
  id: 2,
  username: 'member',
  role_code: EUserRole.MEMBER,
  two_factor_enabled: true,
  ...overrides,
});

describe('AdminUserDialogComponent', () => {
  let fixture: ComponentFixture<AdminUserDialogComponent>;
  let dialogRef: { close: ReturnType<typeof vi.fn> };
  let confirmed: boolean;
  let api: {
    deleteUser: ReturnType<typeof vi.fn>;
    changeUserRole: ReturnType<typeof vi.fn>;
    resetTwoFactor: ReturnType<typeof vi.fn>;
  };
  let snack: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };

  const render = (target: IUser, actorRole: EUserRole) => {
    const initialState: ITestAppState = {
      ...testAppState,
      user: {
        ...testAppState.user,
        info: { ...testAppState.user.info, role_code: actorRole },
      },
    };
    confirmed = true;
    dialogRef = { close: vi.fn() };
    api = {
      deleteUser: vi.fn(() => of(null)),
      changeUserRole: vi.fn(() => of(null)),
      resetTwoFactor: vi.fn(() => of(null)),
    };
    snack = { error: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AdminUserDialogComponent],
      providers: [
        provideMockStore({ initialState }),
        provideTranslateService(),
        { provide: MAT_DIALOG_DATA, useValue: { user: target } },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => of(confirmed) }),
          },
        },
        { provide: AdminApiService, useValue: api },
        { provide: SnackService, useValue: snack },
      ],
    });
    fixture = TestBed.createComponent(AdminUserDialogComponent);
    fixture.detectChanges();
  };

  const button = (label: string): HTMLButtonElement | undefined =>
    [...fixture.nativeElement.querySelectorAll('button')].find(
      (candidate: HTMLButtonElement) => candidate.textContent?.includes(label),
    );

  afterEach(() => TestBed.resetTestingModule());

  it('shows reset when the actor may clear this user', () => {
    render(user(), EUserRole.OWNER);
    expect(fixture.nativeElement.textContent).toContain(
      'ADMIN.USERS.RESET_TWO_FACTOR',
    );
  });

  it('hides reset when two-factor is off', () => {
    render(user({ two_factor_enabled: false }), EUserRole.OWNER);
    expect(fixture.nativeElement.textContent).not.toContain(
      'ADMIN.USERS.RESET_TWO_FACTOR',
    );
  });

  it('hides reset for another admin', () => {
    render(user({ role_code: EUserRole.ADMIN }), EUserRole.ADMIN);
    expect(fixture.nativeElement.textContent).not.toContain(
      'ADMIN.USERS.RESET_TWO_FACTOR',
    );
  });

  it('hides reset for the owner', () => {
    render(user({ id: 1, role_code: EUserRole.OWNER }), EUserRole.ADMIN);
    expect(fixture.nativeElement.textContent).not.toContain(
      'ADMIN.USERS.RESET_TWO_FACTOR',
    );
  });

  it('shows who the dialog is about', () => {
    render(
      user({ id: 7, username: 'member', email: 'member@example.com' }),
      EUserRole.OWNER,
    );
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('member');
    expect(text).toContain('member@example.com');
    expect(text).toContain('7');
  });

  describe('role', () => {
    it('lets the owner promote a member', () => {
      const target = user();
      render(target, EUserRole.OWNER);
      button('ADMIN.USERS.CHANGE_ROLE.TO_ADMIN').click();
      expect(api.changeUserRole).toHaveBeenCalledWith(
        target.id,
        EUserRole.ADMIN,
      );
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('lets the owner demote an admin', () => {
      const target = user({ role_code: EUserRole.ADMIN });
      render(target, EUserRole.OWNER);
      button('ADMIN.USERS.CHANGE_ROLE.TO_MEMBER').click();
      expect(api.changeUserRole).toHaveBeenCalledWith(
        target.id,
        EUserRole.MEMBER,
      );
    });

    it('hides role changes from anyone who is not the owner', () => {
      render(user(), EUserRole.ADMIN);
      expect(button('ADMIN.USERS.CHANGE_ROLE.TO_ADMIN')).toBeUndefined();
      expect(button('ADMIN.USERS.CHANGE_ROLE.TO_MEMBER')).toBeUndefined();
    });

    it('does nothing when the confirmation is declined', () => {
      render(user(), EUserRole.OWNER);
      confirmed = false;
      button('ADMIN.USERS.CHANGE_ROLE.TO_ADMIN').click();
      expect(api.changeUserRole).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it.each<[string, IUser, EUserRole, boolean]>([
      ['a member', user(), EUserRole.ADMIN, true],
      [
        'an admin when the actor is the owner',
        user({ role_code: EUserRole.ADMIN }),
        EUserRole.OWNER,
        true,
      ],
      [
        'another admin',
        user({ role_code: EUserRole.ADMIN }),
        EUserRole.ADMIN,
        false,
      ],
      [
        'the owner',
        user({ id: 1, role_code: EUserRole.OWNER }),
        EUserRole.ADMIN,
        false,
      ],
    ])('offers delete for %s', (_name, target, actor, shown) => {
      render(target, actor);
      expect(!!button('GENERAL.DELETE')).toBe(shown);
    });

    it('deletes the user after confirmation', () => {
      const target = user();
      render(target, EUserRole.OWNER);
      button('GENERAL.DELETE').click();
      expect(api.deleteUser).toHaveBeenCalledWith(target.id);
      expect(dialogRef.close).toHaveBeenCalled();
    });

    it('shows the error and stays open', () => {
      const error = new HttpErrorResponse({ status: 403 });
      render(user(), EUserRole.OWNER);
      api.deleteUser.mockReturnValue(throwError(() => error));
      button('GENERAL.DELETE').click();
      expect(snack.error).toHaveBeenCalledWith(error);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('closes without calling the API', () => {
    render(user(), EUserRole.OWNER);
    button('GENERAL.CLOSE').click();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(api.deleteUser).not.toHaveBeenCalled();
    expect(api.changeUserRole).not.toHaveBeenCalled();
    expect(api.resetTwoFactor).not.toHaveBeenCalled();
  });
});
