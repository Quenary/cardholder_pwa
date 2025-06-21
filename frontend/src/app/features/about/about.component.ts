import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  MatList,
  MatListItem,
  MatListItemIcon,
  MatListItemTitle,
} from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { SystemApiService } from 'src/app/entities/system/system-api.service';
import { MatIcon } from '@angular/material/icon';
import { catchError, from, of, retry } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';

@Component({
  selector: 'app-about',
  imports: [
    MatList,
    MatListItem,
    AsyncPipe,
    TranslateModule,
    MatIcon,
    MatListItemTitle,
    MatListItemIcon,
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  private readonly systemApiService = inject(SystemApiService);
  private readonly snackService = inject(SnackService);

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
}
