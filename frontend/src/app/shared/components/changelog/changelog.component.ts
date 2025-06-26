import { AsyncPipe } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { ChangelogService } from 'src/app/core/services/changelog.service';

/**
 * Options for {@link ChangelogComponent} and {@link ChangelogDialogComponent}
 */
export interface IChangelogComponentData {
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
  imports: [AsyncPipe],
  templateUrl: './changelog.component.html',
  styleUrl: './changelog.component.scss',
})
export class ChangelogComponent
  implements OnInit, OnChanges, IChangelogComponentData
{
  protected readonly changelogService = inject(ChangelogService);

  @Input() versionPredicate: (version: string) => boolean;

  public changelog$: Observable<SafeHtml> = of(null);

  ngOnInit(): void {
    this.changelog$ = this.getChangelog();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.versionPredicate && !changes.versionPredicate.firstChange) {
      this.changelog$ = this.getChangelog();
    }
  }

  protected getChangelog(): Observable<SafeHtml> {
    return this.versionPredicate
      ? this.changelogService.getChangelogHtmlByVersion(this.versionPredicate)
      : this.changelogService.getChangelogHtml();
  }
}

@Component({
  selector: 'app-changelog-dialog',
  imports: [MatDialogModule, TranslateModule, AsyncPipe, MatButton],
  template: `
  <h1 mat-dialog-title>{{'ABOUT.CHANGELOG' | translate}}</h1>
  <mat-dialog-content>
    <div [innerHTML]="changelog$ | async"></div>
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
  implements IChangelogComponentData
{
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: IChangelogComponentData = inject(MAT_DIALOG_DATA);
  public override versionPredicate: (version: string) => boolean =
    this.data.versionPredicate;

  public close(): void {
    this.matDialogRef.close();
  }
}
