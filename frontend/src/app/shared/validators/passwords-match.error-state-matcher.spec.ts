import { FormControl, FormGroup, FormGroupDirective } from '@angular/forms';
import { PasswordsMatchErrorStateMatcher } from './passwords-match.error-state-matcher';
import { passwordMatchValidator } from './passwords-match.validator';

describe('PasswordsMatchErrorStateMatcher', () => {
  let matcher: PasswordsMatchErrorStateMatcher;
  let form: FormGroup;

  const directive = (submitted: boolean) =>
    ({
      submitted,
      hasError: (code: string) => form.hasError(code),
    }) as unknown as FormGroupDirective;

  beforeEach(() => {
    matcher = new PasswordsMatchErrorStateMatcher();
    form = new FormGroup(
      {
        password: new FormControl('Passw0rd'),
        confirm_password: new FormControl('Passw0rd'),
      },
      [passwordMatchValidator()],
    );
  });

  describe('isErrorState', () => {
    it('is false when passwords match', () => {
      const control = form.controls['confirm_password'];
      control.markAsTouched();

      expect(matcher.isErrorState(control, directive(false))).toBe(false);
    });

    it('is false before the user touches confirmation', () => {
      form.controls['confirm_password'].setValue('other');

      expect(
        matcher.isErrorState(
          form.controls['confirm_password'],
          directive(false),
        ),
      ).toBe(false);
    });

    it('is true after confirmation is touched', () => {
      const control = form.controls['confirm_password'];
      control.setValue('other');
      control.markAsTouched();

      expect(matcher.isErrorState(control, directive(false))).toBe(true);
    });

    it('is true on submit without interaction', () => {
      form.controls['confirm_password'].setValue('other');

      expect(
        matcher.isErrorState(
          form.controls['confirm_password'],
          directive(true),
        ),
      ).toBe(true);
    });
  });
});
