import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatList,
  MatListItem,
  MatListItemIcon,
  MatListItemTitle,
} from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { CodeExamplesComponent } from '../code-examples/code-examples.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { ChangelogComponent } from 'src/app/shared/components/changelog/changelog.component';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAppVersion } from 'src/app/state/app.selectors';

@Component({
  selector: 'app-about',
  imports: [
    MatList,
    MatListItem,
    TranslateModule,
    MatIcon,
    MatListItemTitle,
    MatListItemIcon,
    CodeExamplesComponent,
    MatExpansionModule,
    ChangelogComponent,
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private readonly store = inject(Store);

  public readonly version = toSignal(this.store.select(selectAppVersion));
}
