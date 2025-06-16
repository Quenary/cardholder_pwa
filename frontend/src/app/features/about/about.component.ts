import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  MatDivider,
  MatList,
  MatListItem,
  MatListItemIcon,
  MatListItemTitle,
} from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { SystemApiService } from 'src/app/entities/system/system-api.service';
import { version } from '../../../../package.json';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { share } from 'rxjs';

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
  public readonly version$ = this.systemApiService.version();
  public readonly frontendVersion = version;
  public readonly smtpStatus$ = this.systemApiService
    .smtpStatus()
    .pipe(share());

  onSmtpTest(): void {
    this.systemApiService.smtpTest().subscribe();
  }
}
