import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  MatDivider,
  MatList,
  MatListItem,
  MatListItemIcon,
  MatListItemTitle,
} from '@angular/material/list';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SystemApiService } from 'src/app/entities/system/system-api.service';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { catchError, from, of, retry, share } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';

@Component({
  selector: 'app-about',
  imports: [
    MatList,
    MatListItem,
    AsyncPipe,
    TranslateModule,
    MatButton,
    MatIcon,
    MatListItemTitle,
    MatDivider,
    MatListItemIcon,
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  private readonly systemApiService = inject(SystemApiService);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);

  public readonly version$ = this.systemApiService.version().pipe(
    retry({ count: 1, delay: 1000 }),
    catchError((error) => {
      this.snackService.error(error);
      return of(null);
    })
  );
  public readonly frontendVersion$ = from(
    import('../../../../package.json').then((p) => p.version)
  );
  public readonly smtpStatus$ = this.systemApiService.smtpStatus().pipe(
    retry({ count: 1, delay: 1000 }),
    catchError((error) => {
      this.snackService.error(error);
      return of(null);
    }),
    share()
  );

  onSmtpTest(): void {
    this.systemApiService.smtpTest().subscribe({
      next: () => {
        this.snackService.success(
          this.translateService.instant('ABOUT.SMTP_TEST_SUCCESS')
        );
      },
      error: (error) => {
        this.snackService.error(error);
      },
    });
  }
}
