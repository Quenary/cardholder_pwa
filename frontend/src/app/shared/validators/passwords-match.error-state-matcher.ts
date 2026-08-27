import { AbstractControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';

/**
 * Makes the group level error of passwordMatchValidator visible on the
 * confirmation field.
 *
 * The default matcher only looks at the control itself, and the validator
 * sits on the form group, so a mismatch never reaches the UI: the form is
 * invalid, submit returns early, and nothing is shown to the user.
 */
export class PasswordsMatchErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: AbstractControl | null,
    form: FormGroupDirective | NgForm | null,
  ): boolean {
    const interacted = !!(
      control?.dirty ||
      control?.touched ||
      form?.submitted
    );
    const mismatch = !!form?.hasError('passwordMatchValidator');
    return interacted && !!(control?.invalid || mismatch);
  }
}
