import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CardLogoPipe } from './card-logo.pipe';
import { ICard } from 'src/app/entities/cards/cards-interface';

describe('CardLogoPipe', () => {
  let pipe: CardLogoPipe;
  let httpMock: HttpTestingController;

  const card = (over: Partial<ICard> = {}): ICard =>
    ({
      id: 1,
      name: 'card',
      code: '12345678',
      code_type: 'ean8',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      has_logo: true,
      ...over,
    }) as ICard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CardLogoPipe,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    pipe = TestBed.inject(CardLogoPipe);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should not request anything when the card has no logo', async () => {
    await expect(
      firstValueFrom(pipe.transform(card({ has_logo: false }))),
    ).resolves.toBeNull();
    httpMock.expectNone(() => true);
  });

  it('should not request anything without a card', async () => {
    await expect(firstValueFrom(pipe.transform(null))).resolves.toBeNull();
    httpMock.expectNone(() => true);
  });

  it('should fetch the logo only once for the same card', async () => {
    const first = firstValueFrom(pipe.transform(card()));
    httpMock
      .expectOne('/api/cards/1/logo')
      .flush(new Blob(['x'], { type: 'image/webp' }));
    await expect(first).resolves.toBeTruthy();

    // Same card again: served from the cache, no second request.
    await expect(firstValueFrom(pipe.transform(card()))).resolves.toBeTruthy();
    httpMock.expectNone('/api/cards/1/logo');
  });

  it('should fetch again once the card has been updated', async () => {
    const first = firstValueFrom(pipe.transform(card()));
    httpMock
      .expectOne('/api/cards/1/logo')
      .flush(new Blob(['x'], { type: 'image/webp' }));
    await first;

    const second = firstValueFrom(
      pipe.transform(card({ updated_at: '2026-02-02' })),
    );
    httpMock
      .expectOne('/api/cards/1/logo')
      .flush(new Blob(['y'], { type: 'image/webp' }));
    await expect(second).resolves.toBeTruthy();
  });

  it('should fall back to no image when the request fails', async () => {
    const result = firstValueFrom(pipe.transform(card()));
    // A blob-typed request cannot be flushed with a text body, so the failure
    // is simulated with an error response instead.
    httpMock.expectOne('/api/cards/1/logo').error(new ProgressEvent('error'), {
      status: 404,
      statusText: 'Not Found',
    });
    await expect(result).resolves.toBeNull();
  });
});
