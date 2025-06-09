import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Data interface for {@link ConfirmDialogComponent}
 */
export interface IConfirmDialogData {
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
  standalone: true,
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    TranslateModule,
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject(MatDialogRef);
  private readonly data = inject(MAT_DIALOG_DATA);
  public readonly title = this.data?.title ?? 'GENERAL.UNSAVED_WARN';
  public readonly subtitle = this.data?.subtitle ?? null;
  public readonly cancelText = this.data?.cancelText ?? 'GENERAL.CANCEL';
  public readonly confirmText = this.data?.confirmText ?? 'GENERAL.CONFIRM';
  public cancel(): void {
    this.dialogRef.close(false);
  }
  public confirm(): void {
    this.dialogRef.close(true);
  }
}
