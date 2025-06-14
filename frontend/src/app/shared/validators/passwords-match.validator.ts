import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator = (
  field1 = 'password',
  field2 = 'confirm_password'
): ValidatorFn => {
  return (control: AbstractControl) => {
    const form = control as FormGroup;
    const value1 = form.controls[field1].value;
    const value2 = form.controls[field2].value;
    if (value1 != value2) {
      return { passwordMatchValidator: true };
    }
    return null;
  };
};
