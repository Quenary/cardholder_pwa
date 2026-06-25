import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal, resource } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, retry, catchError, of, finalize, firstValueFrom } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import { PublicApiService } from 'src/app/entities/public/public-api.service';

@Component({
  selector: 'app-admin-status',
  imports: [
    MatListModule,
    MatButton,
    MatIcon,
    TranslatePipe,
    NgTemplateOutlet,
    MatProgressSpinner,
  ],
  templateUrl: './admin-status.component.html',
  styleUrl: './admin-status.component.scss',
})
export class AdminStatusComponent {
  private readonly translateService = inject(TranslateService);
  private readonly adminApiService = inject(AdminApiService);
  private readonly snackService = inject(SnackService);
  private readonly publicApiService = inject(PublicApiService);

  protected readonly health = resource<boolean, unknown>({
    loader: () =>
      firstValueFrom(
        this.publicApiService.health().pipe(
          map(() => true),
          catchError((error) => {
            this.snackService.error(error);
            return of(false);
          }),
        ),
      ),
  });
  protected readonly smtpStatus = resource<boolean, unknown>({
    loader: () =>
      firstValueFrom(
        this.adminApiService.smtpStatus().pipe(
          retry({ count: 1, delay: 1000 }),
          catchError((error) => {
            this.snackService.error(error);
            return of(false);
          }),
        ),
      ),
  });
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
