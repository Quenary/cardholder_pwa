import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, retry, catchError, of, finalize } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import { PublicApiService } from 'src/app/entities/public/public-api.service';

@Component({
  selector: 'app-admin-status',
  imports: [MatListModule, MatButton, MatIcon, TranslatePipe, NgTemplateOutlet],
  templateUrl: './admin-status.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './admin-status.component.scss',
})
export class AdminStatusComponent {
  private readonly translateService = inject(TranslateService);
  private readonly adminApiService = inject(AdminApiService);
  private readonly snackService = inject(SnackService);
  private readonly publicApiService = inject(PublicApiService);

  protected readonly health = toSignal(
    this.publicApiService.health().pipe(
      map(() => true),
      retry({ count: 1, delay: 1000 }),
      catchError((error) => {
        this.snackService.error(error);
        return of(false);
      }),
    ),
    { initialValue: true },
  );
  protected readonly smtpStatus = toSignal(
    this.adminApiService.smtpStatus().pipe(
      retry({ count: 1, delay: 1000 }),
      catchError((error) => {
        this.snackService.error(error);
        return of(false);
      }),
    ),
    { initialValue: true },
  );
  protected readonly smtpLoading = signal<boolean>(false);

  protected onSmtpTest(): void {
    this.smtpLoading.set(true);
    this.adminApiService
      .smtpTest()
      .pipe(
        finalize(() => {
          this.smtpLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.snackService.success(
            this.translateService.instant('ADMIN.SMTP_TEST_SUCCESS'),
          );
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }
}
