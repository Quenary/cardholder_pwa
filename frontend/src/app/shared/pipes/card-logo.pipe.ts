import { DestroyRef, inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { ICard } from 'src/app/entities/cards/cards-interface';

/**
 * Resolves a card logo to a displayable URL.
 *
 * The logo endpoint is authenticated, so the image cannot be loaded by the
 * browser directly; it is fetched through `HttpClient` (which carries the
 * token) and turned into an object URL.
 *
 * Each use of the pipe gets its own instance, so this holds the last result
 * only: that is the whole lifetime it can actually serve. It keeps a row from
 * refetching on every change detection, and a new request is issued when the
 * card or its `updated_at` changes. The object URL is revoked when it is
 * replaced and when the pipe is destroyed, so blobs are not leaked.
 */
@Pipe({
  name: 'cardLogo',
  pure: true,
})
export class CardLogoPipe implements PipeTransform {
  private readonly cardApiService = inject(CardApiService);
  private readonly domSanitizer = inject(DomSanitizer);

  private lastKey: string | null = null;
  private last$: Observable<SafeUrl | null> = of(null);
  private objectUrl: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  transform(card: ICard | null | undefined): Observable<SafeUrl | null> {
    if (!card?.id || !card.has_logo) {
      return of(null);
    }

    const updatedAt = card.updated_at ?? '';
    const key = `${card.id}:${updatedAt}`;
    if (key === this.lastKey) {
      return this.last$;
    }

    this.lastKey = key;
    this.last$ = this.cardApiService.getLogoBlob(card.id, updatedAt).pipe(
      map((blob) => {
        this.revoke();
        this.objectUrl = URL.createObjectURL(blob);
        return this.domSanitizer.bypassSecurityTrustUrl(this.objectUrl);
      }),
      // A missing logo must never break the list: fall back to no image.
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.last$;
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
