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

  describe('transform', () => {
    it('returns null when the card has no logo', async () => {
      await expect(
        firstValueFrom(pipe.transform(card({ has_logo: false }))),
      ).resolves.toBeNull();
      httpMock.expectNone(() => true);
    });

    it('returns null without a card', async () => {
      await expect(firstValueFrom(pipe.transform(null))).resolves.toBeNull();
      httpMock.expectNone(() => true);
    });

    it('fetches once for the same card', async () => {
      const first = firstValueFrom(pipe.transform(card()));
      httpMock
        .expectOne('/api/cards/1/logo?updatedAt=2026-01-01')
        .flush(new Blob(['x'], { type: 'image/webp' }));
      await expect(first).resolves.toBeTruthy();

      await expect(
        firstValueFrom(pipe.transform(card())),
      ).resolves.toBeTruthy();
      httpMock.expectNone(() => true);
    });

    it('refetches when updated_at changes', async () => {
      const first = firstValueFrom(pipe.transform(card()));
      httpMock
        .expectOne('/api/cards/1/logo?updatedAt=2026-01-01')
        .flush(new Blob(['x'], { type: 'image/webp' }));
      await first;

      const second = firstValueFrom(
        pipe.transform(card({ updated_at: '2026-02-02' })),
      );
      httpMock
        .expectOne('/api/cards/1/logo?updatedAt=2026-02-02')
        .flush(new Blob(['y'], { type: 'image/webp' }));
      await expect(second).resolves.toBeTruthy();
    });

    it('returns null on HTTP error', async () => {
      const result = firstValueFrom(pipe.transform(card()));
      httpMock
        .expectOne('/api/cards/1/logo?updatedAt=2026-01-01')
        .error(new ProgressEvent('error'), {
          status: 404,
          statusText: 'Not Found',
        });
      await expect(result).resolves.toBeNull();
    });
  });
});
