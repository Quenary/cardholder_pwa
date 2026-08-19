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
 * Results are cached per card *and* per `updated_at`, so scrolling a long list
 * issues one request per card, while replacing a logo still refreshes it. The
 * object URLs are revoked when the pipe is destroyed to avoid leaking blobs.
 */
@Pipe({
  name: 'cardLogo',
  pure: true,
})
export class CardLogoPipe implements PipeTransform {
  private readonly cardsApiService = inject(CardApiService);
  private readonly domSanitizer = inject(DomSanitizer);

  private readonly cache = new Map<string, Observable<SafeUrl | null>>();
  private readonly objectUrls: string[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
      this.objectUrls.length = 0;
      this.cache.clear();
    });
  }

  transform(card: ICard | null | undefined): Observable<SafeUrl | null> {
    if (!card?.id || !card.has_logo) {
      return of(null);
    }

    const key = `${card.id}:${card.updated_at ?? ''}`;
    let logo$ = this.cache.get(key);

    if (!logo$) {
      logo$ = this.cardsApiService.getLogoBlob(card.id).pipe(
        map((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.objectUrls.push(objectUrl);
          return this.domSanitizer.bypassSecurityTrustUrl(objectUrl);
        }),
        // A missing logo must never break the list: fall back to no image.
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cache.set(key, logo$);
    }

    return logo$;
  }
}
