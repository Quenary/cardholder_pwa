import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CardApiService } from './cards-api.service';

describe('CardApiService', () => {
  let service: CardApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CardApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should send a filename even when the File has none', async () => {
    // Installed iOS PWAs often produce File objects with an empty name.
    // FastAPI then 422s the multipart part unless filename= is present.
    const file = new File([new Uint8Array([1, 2, 3])], '', {
      type: 'image/jpeg',
    });
    const pending = firstValueFrom(service.uploadLogo(1, file));
    const req = httpMock.expectOne('/api/cards/1/logo');
    const body = req.request.body as FormData;
    const uploaded = body.get('file') as File;

    expect(uploaded).toBeInstanceOf(File);
    expect(uploaded.name).toMatch(/^\d+\.jpg$/);
    req.flush({ id: 1 });
    await pending;
  });
});
