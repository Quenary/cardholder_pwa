import { Component, computed, inject, Input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { ChangelogService } from 'src/app/core/services/changelog.service';

/**
 * Options for {@link ChangelogDialogComponent}
 */
export interface IChangelogDialogComponentData {
  /**
   * Version predicate for filtering
   * @param version version string
   * @example (v) => v > '1.0.1'
   * @returns
   */
  versionPredicate: (version: string) => boolean;
}

@Component({
  selector: 'app-changelog',
  imports: [],
  templateUrl: './changelog.component.html',
  styleUrl: './changelog.component.scss',
})
export class ChangelogComponent {
  protected readonly changelogService = inject(ChangelogService);

  @Input() set versionPredicate(value: (version: string) => boolean) {
    this._versionPredicate.set(value);
  }
  protected readonly _versionPredicate =
    signal<(version: string) => boolean>(null);
  protected readonly _changelog = toSignal(
    this.changelogService.getChangelogHtml(),
  );
  public readonly changelog = computed(() => {
    const _versionPredicate = this._versionPredicate();
    const _changelog = this._changelog();
    if (_versionPredicate) {
      return this.changelogService.filterChangelogHtml(
        _changelog,
        _versionPredicate,
      );
    }
    return _changelog;
  });
}

@Component({
  selector: 'app-changelog-dialog',
  imports: [MatDialogModule, TranslateModule, MatButton],
  template: `
  <h1 mat-dialog-title>{{'ABOUT.CHANGELOG' | translate}}</h1>
  <mat-dialog-content>
    <div [innerHTML]="changelog()"></div>
  </mat-dialog-content>
  <mat-dialog-actions>
    <button
      mat-flat-button
      (click)="close()">
      {{ 'GENERAL.CLOSE' | translate }}
    </button>
  </mat-dialog-actions>
  `,
})
export class ChangelogDialogComponent
  extends ChangelogComponent
  implements IChangelogDialogComponentData
{
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: IChangelogDialogComponentData = inject(MAT_DIALOG_DATA);

  constructor() {
    super();
    this._versionPredicate.set(this.data.versionPredicate);
  }

  public close(): void {
    this.matDialogRef.close();
  }
}
