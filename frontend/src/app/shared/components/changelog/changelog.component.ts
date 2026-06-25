import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
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
  templateUrl: './changelog.component.html',
  styleUrl: './changelog.component.scss',
})
export class ChangelogComponent {
  protected readonly changelogService = inject(ChangelogService);

  protected readonly versionPredicate =
    signal<(version: string) => boolean>(null);
  protected readonly changelog = toSignal(
    this.changelogService.getChangelogHtml(),
  );
  protected readonly filteredChangelog = computed(() => {
    const versionPredicate = this.versionPredicate();
    const changelog = this.changelog();

    if (versionPredicate) {
      return this.changelogService.filterChangelogHtml(
        changelog,
        versionPredicate,
      );
    }
    return changelog;
  });
}

@Component({
  selector: 'app-changelog-dialog',
  imports: [MatDialogModule, TranslatePipe, MatButton],
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
export class ChangelogDialogComponent extends ChangelogComponent {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: IChangelogDialogComponentData =
    inject(MAT_DIALOG_DATA);

  constructor() {
    super();
    this.versionPredicate.set(this.data.versionPredicate);
  }

  protected close(): void {
    this.matDialogRef.close();
  }
}
