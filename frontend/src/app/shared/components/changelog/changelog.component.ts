import { AsyncPipe } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { ChangelogService } from 'src/app/core/services/changelog.service';

@Component({
  selector: 'app-changelog',
  imports: [AsyncPipe],
  templateUrl: './changelog.component.html',
  styleUrl: './changelog.component.scss',
})
export class ChangelogComponent implements OnInit, OnChanges {
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
