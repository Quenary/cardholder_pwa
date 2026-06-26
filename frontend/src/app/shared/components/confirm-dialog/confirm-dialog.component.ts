import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Data interface for {@link ConfirmDialogComponent}
 */
export interface IConfirmDialogData {
  /**
   * Additional checkbox to activate the confirmation button
   */
  addCheckbox?: boolean;
  title?: string;
  subtitle?: string;
  cancelText?: string;
  confirmText?: string;
}

/**
 * Simple confirm dialog component.
 * Returns true on confirm click, false otherwise.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    TranslatePipe,
    MatCheckbox,
    FormsModule,
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject(MatDialogRef);
  private readonly data = inject(MAT_DIALOG_DATA);

  protected readonly addCheckbox = this.data?.addCheckbox ?? false;
  protected readonly title = this.data?.title ?? 'GENERAL.UNSAVED_WARN';
  protected readonly subtitle = this.data?.subtitle ?? null;
  protected readonly cancelText = this.data?.cancelText ?? 'GENERAL.CANCEL';
  protected readonly confirmText = this.data?.confirmText ?? 'GENERAL.CONFIRM';
  protected readonly confirmCheckbox = signal(false);

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
