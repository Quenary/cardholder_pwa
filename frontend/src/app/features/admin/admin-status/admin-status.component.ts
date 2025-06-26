import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, retry, catchError, of, share } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import { PublicApiService } from 'src/app/entities/public/public-api.service';

@Component({
  selector: 'app-admin-status',
  imports: [
    MatListModule,
    MatButton,
    MatIcon,
    AsyncPipe,
    TranslateModule,
    NgTemplateOutlet,
  ],
  templateUrl: './admin-status.component.html',
  styleUrl: './admin-status.component.scss',
})
export class AdminStatusComponent {
  private readonly translateService = inject(TranslateService);
  private readonly adminApiService = inject(AdminApiService);
  private readonly snackService = inject(SnackService);
  private readonly publicApiService = inject(PublicApiService);

  public readonly health$ = this.publicApiService.health().pipe(
    map(() => true),
    retry({ count: 1, delay: 1000 }),
    catchError((error) => {
      this.snackService.error(error);
      return of(false);
    }),
    share()
  );
  public readonly smtpStatus$ = this.adminApiService.smtpStatus().pipe(
    retry({ count: 1, delay: 1000 }),
    catchError((error) => {
      this.snackService.error(error);
      return of(false);
    }),
    share()
  );

  onSmtpTest(): void {
    this.adminApiService.smtpTest().subscribe({
      next: () => {
        this.snackService.success(
          this.translateService.instant('ADMIN.SMTP_TEST_SUCCESS')
        );
      },
      error: (error) => {
        this.snackService.error(error);
      },
    });
  }
}
