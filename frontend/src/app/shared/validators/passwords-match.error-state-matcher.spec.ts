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

  it('stays quiet while the passwords match', () => {
    const control = form.controls['confirm_password'];
    control.markAsTouched();

    expect(matcher.isErrorState(control, directive(false))).toBe(false);
  });

  it('stays quiet on a mismatch the user has not reached yet', () => {
    form.controls['confirm_password'].setValue('other');

    expect(
      matcher.isErrorState(form.controls['confirm_password'], directive(false)),
    ).toBe(false);
  });

  it('reports a mismatch once the confirmation field has been touched', () => {
    const control = form.controls['confirm_password'];
    control.setValue('other');
    control.markAsTouched();

    expect(matcher.isErrorState(control, directive(false))).toBe(true);
  });

  it('reports a mismatch on submit, without any interaction', () => {
    form.controls['confirm_password'].setValue('other');

    expect(
      matcher.isErrorState(form.controls['confirm_password'], directive(true)),
    ).toBe(true);
  });
});
