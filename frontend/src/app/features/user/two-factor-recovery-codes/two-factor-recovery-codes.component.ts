import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SnackService } from 'src/app/core/services/snack.service';

@Component({
  selector: 'app-two-factor-recovery-codes',
  imports: [MatButton, MatCheckbox, MatIcon, TranslatePipe],
  templateUrl: './two-factor-recovery-codes.component.html',
  styleUrl: './two-factor-recovery-codes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorRecoveryCodesComponent {
  private readonly clipboard = inject(Clipboard);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);

  public readonly codes = input.required<string[]>();
  public readonly done = output<void>();

  protected readonly saved = signal(false);

  protected copyAll(): void {
    this.clipboard.copy(this.codes().join('\n'));
    this.snackService.success(
      this.translateService.instant('USER.TWO_FACTOR.COPIED'),
    );
  }

  protected download(): void {
    const blob = new Blob([`${this.codes().join('\n')}\n`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cardholder-recovery-codes.txt';
    // A detached anchor does not download in Firefox, and revoking the blob
    // URL in this turn drops the file before the browser has read it.
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
