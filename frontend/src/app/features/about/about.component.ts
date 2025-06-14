import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatList, MatListItem } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { PublicApiService } from 'src/app/entities/public/public-api.service';
import {version} from '../../../../package.json';

@Component({
  selector: 'app-about',
  imports: [MatList, MatListItem, AsyncPipe, TranslateModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  private readonly publicApiService = inject(PublicApiService);
  public readonly version$ = this.publicApiService.version();
  public readonly frontendVersion = version;
}
