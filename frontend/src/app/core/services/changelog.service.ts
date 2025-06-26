import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import {
  catchError,
  first,
  from,
  map,
  Observable,
  of,
  retry,
  shareReplay,
  switchMap,
  timeout,
} from 'rxjs';
import { SnackService } from './snack.service';
import { Store } from '@ngrx/store';
import { selectAppVersion } from 'src/app/state/app.selectors';
import { IVersion } from 'src/app/entities/public/public-interface';

@Injectable({
  providedIn: 'root',
})
export class ChangelogService {
  private readonly httpClient = inject(HttpClient);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly snackService = inject(SnackService);
  private readonly store = inject(Store);

  private readonly changelogHtml$ = this.store.select(selectAppVersion).pipe(
    first((version) => !!version),
    timeout({ first: 1000, with: () => of(<IVersion>{}) }),
    switchMap((version) =>
      // query parameter is a hack for bypass cache and get new file
      this.httpClient.get(`/CHANGELOG.md?v=${version.image_version}`, {
        responseType: 'text',
      }),
    ),
    switchMap((changelog) => from(marked(changelog, { async: true }))),
    map((res) => this.domSanitizer.bypassSecurityTrustHtml(res)),
    retry({ count: 1, delay: 1000 }),
    catchError((error) => {
      this.snackService.error(error);
      return of(null);
    }),
    shareReplay(1),
  );

  getChangelogHtml(): Observable<SafeHtml> {
    return this.changelogHtml$;
  }

  /**
   *
   * @param versionPredicate
   * @returns
   */
  getChangelogHtmlByVersion(
    versionPredicate: (v: string) => boolean,
  ): Observable<SafeHtml> {
    return this.changelogHtml$.pipe(
      map((res) => this.filterChangelogHtml(res, versionPredicate)),
    );
  }

  /**
   * Filter changelog html by version predicate
   * @param html
   * @param versionPredicate
   * @returns
   */
  private filterChangelogHtml(
    html: SafeHtml,
    versionPredicate: (v: string) => boolean,
  ): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html as string, 'text/html');

    const container = document.createElement('div');
    const body = doc.body;
    const children = Array.from(body.children);

    let currentVersion = '';
    let block: Element[] = [];

    const versionHeaderRegex = /^(\d+\.\d+\.\d+)/;

    for (const el of children) {
      if (el.tagName === 'H1') {
        const versionMatch = el.textContent?.match(versionHeaderRegex);
        if (versionMatch) {
          // Save block on new block, if predicate is true
          if (block.length && versionPredicate(currentVersion)) {
            block.forEach((e) => container.appendChild(e.cloneNode(true)));
          }
          currentVersion = versionMatch[1];
          block = [el];
        } else {
          // h1 without version text is unusual, save just in case
          block.push(el);
        }
      } else {
        block.push(el);
      }
    }
    // Last blocks
    if (block.length && versionPredicate(currentVersion)) {
      block.forEach((e) => container.appendChild(e.cloneNode(true)));
    }

    return container.innerHTML;
  }
}
