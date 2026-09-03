import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardPreviewComponent } from './card-preview.component';
import { createMatDialogMock } from 'src/testing';
import { MatDialog } from '@angular/material/dialog';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { of } from 'rxjs';
import { ICard } from 'src/app/entities/cards/cards-interface';
import { CardCodeViewerDialogComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { provideTranslateService } from '@ngx-translate/core';

describe('CardPreviewComponent', () => {
  let fixture: ComponentFixture<CardPreviewComponent>;
  let component: CardPreviewComponent;
  let matDialogMock: ReturnType<typeof createMatDialogMock>;
  let cardApiServiceMock: { getLogoBlob: ReturnType<typeof vi.fn> };

  const sampleCardWithLogo: ICard = {
    id: 1,
    name: 'Logo Card',
    code: '12345678',
    code_type: 'ean8',
    color: '#123456',
    description: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    has_logo: true,
  };

  const sampleCardWithBarcode: ICard = {
    id: 2,
    name: 'Barcode Card',
    code: '0123456789012',
    code_type: 'ean13',
    color: '#654321',
    description: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    has_logo: false,
  };

  const sampleInvalidCard: ICard = {
    id: 3,
    name: 'Fallback Card',
    code: '',
    code_type: 'invalid_type',
    color: '#ff0000',
    description: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    has_logo: false,
  };

  beforeEach(async () => {
    matDialogMock = createMatDialogMock();
    cardApiServiceMock = {
      getLogoBlob: vi
        .fn()
        .mockReturnValue(of(new Blob([''], { type: 'image/png' }))),
    };

    vi.spyOn(console, 'error').mockImplementation(() => 1);

    await TestBed.configureTestingModule({
      imports: [CardPreviewComponent],
      providers: [
        provideTranslateService(),
        { provide: MatDialog, useValue: matDialogMock },
        { provide: CardApiService, useValue: cardApiServiceMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display logo when card.has_logo is true', async () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', sampleCardWithLogo);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const logoContainer =
      fixture.nativeElement.querySelector('.card-preview-logo');
    const img = fixture.nativeElement.querySelector('.card-preview-logo img');

    expect(logoContainer).toBeTruthy();
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('Logo Card');
  });

  it('should display card-code-viewer when card has barcode and no logo', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', sampleCardWithBarcode);
    fixture.detectChanges();

    const barcodeViewer = fixture.nativeElement.querySelector(
      'app-card-code-viewer',
    );
    const logoContainer =
      fixture.nativeElement.querySelector('.card-preview-logo');
    const fallbackContainer = fixture.nativeElement.querySelector(
      '.card-preview-fallback',
    );

    expect(barcodeViewer).toBeTruthy();
    expect(logoContainer).toBeNull();
    expect(fallbackContainer).toBeNull();
  });

  it('should display fallback when card has no logo and invalid code', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', sampleInvalidCard);
    fixture.detectChanges();

    const fallbackContainer = fixture.nativeElement.querySelector(
      '.card-preview-fallback',
    );
    const icon = fixture.nativeElement.querySelector(
      '.card-preview-fallback mat-icon',
    );

    expect(fallbackContainer).toBeTruthy();
    expect(icon).toBeTruthy();
    expect(icon.textContent?.trim()).toBe('credit_card');
  });

  it('should display fallback when card is null', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', null);
    fixture.detectChanges();

    const fallbackContainer = fixture.nativeElement.querySelector(
      '.card-preview-fallback',
    );
    expect(fallbackContainer).toBeTruthy();
  });

  it('should open dialog and emit previewClick on logo click when interactive is true', async () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', sampleCardWithLogo);
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const previewClickSpy = vi.fn();
    component = fixture.componentInstance;
    component.previewClick.subscribe(previewClickSpy);

    const hostElement: HTMLElement = fixture.nativeElement;
    hostElement.click();

    expect(previewClickSpy).toHaveBeenCalledWith(sampleCardWithLogo);
    expect(matDialogMock.open).toHaveBeenCalledWith(
      CardCodeViewerDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ card: sampleCardWithLogo, scale: 6 }),
      }),
    );
  });

  it('should not open dialog on logo click when interactive is false', async () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', sampleCardWithLogo);
    fixture.componentRef.setInput('interactive', false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const hostElement: HTMLElement = fixture.nativeElement;
    hostElement.click();

    expect(matDialogMock.open).not.toHaveBeenCalled();
  });

  it('should open dialog and emit previewClick on keydown Enter when interactive is true', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', sampleCardWithBarcode);
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();

    const previewClickSpy = vi.fn();
    component = fixture.componentInstance;
    component.previewClick.subscribe(previewClickSpy);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });
    fixture.nativeElement.dispatchEvent(event);

    expect(previewClickSpy).toHaveBeenCalledWith(sampleCardWithBarcode);
    expect(matDialogMock.open).toHaveBeenCalledWith(
      CardCodeViewerDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({ card: sampleCardWithBarcode }),
      }),
    );
  });

  it('should open dialog and emit previewClick on keydown Space when interactive is true', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('card', sampleCardWithLogo);
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();

    const previewClickSpy = vi.fn();
    component = fixture.componentInstance;
    component.previewClick.subscribe(previewClickSpy);

    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    fixture.nativeElement.dispatchEvent(event);

    expect(previewClickSpy).toHaveBeenCalledWith(sampleCardWithLogo);
    expect(matDialogMock.open).toHaveBeenCalledTimes(1);
  });

  it('should apply mini class when size is mini', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('size', 'mini');
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('mini')).toBe(true);
  });

  it('should apply non-interactive class when interactive is false', () => {
    fixture = TestBed.createComponent(CardPreviewComponent);
    fixture.componentRef.setInput('interactive', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('non-interactive')).toBe(
      true,
    );
    expect(fixture.nativeElement.classList.contains('interactive')).toBe(false);
  });
});
