import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardPreviewComponent } from './card-preview.component';
import { createCardApiServiceMock, createMatDialogMock } from 'src/testing';
import { MatDialog } from '@angular/material/dialog';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { Mocked } from 'vitest';
import { ICard } from 'src/app/entities/cards/cards-interface';
import { CardCodeViewerDialogComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { provideTranslateService } from '@ngx-translate/core';

describe('CardPreviewComponent', () => {
  let fixture: ComponentFixture<CardPreviewComponent>;
  let component: CardPreviewComponent;
  let matDialogMock: ReturnType<typeof createMatDialogMock>;
  let cardApiServiceMock: Mocked<CardApiService>;

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
    cardApiServiceMock = createCardApiServiceMock();

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

  describe('template', () => {
    it('shows logo when has_logo', async () => {
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

    it('shows code viewer for barcode without logo', () => {
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

    describe('fallback', () => {
      it('shows icon for invalid code', () => {
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

      it('shows icon when card is null', () => {
        fixture = TestBed.createComponent(CardPreviewComponent);
        fixture.componentRef.setInput('card', null);
        fixture.detectChanges();

        const fallbackContainer = fixture.nativeElement.querySelector(
          '.card-preview-fallback',
        );
        expect(fallbackContainer).toBeTruthy();
      });
    });
  });

  describe('interactive preview', () => {
    it('opens dialog on click', async () => {
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

    it('ignores click when non-interactive', async () => {
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

    it('opens on Enter', () => {
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

    it('opens on Space', () => {
      fixture = TestBed.createComponent(CardPreviewComponent);
      fixture.componentRef.setInput('card', sampleCardWithLogo);
      fixture.componentRef.setInput('interactive', true);
      fixture.detectChanges();

      const previewClickSpy = vi.fn();
      component = fixture.componentInstance;
      component.previewClick.subscribe(previewClickSpy);

      const event = new KeyboardEvent('keydown', {
        key: ' ',
        cancelable: true,
      });
      fixture.nativeElement.dispatchEvent(event);

      expect(previewClickSpy).toHaveBeenCalledWith(sampleCardWithLogo);
      expect(matDialogMock.open).toHaveBeenCalledTimes(1);
    });
  });

  describe('host classes', () => {
    it('applies mini', () => {
      fixture = TestBed.createComponent(CardPreviewComponent);
      fixture.componentRef.setInput('size', 'mini');
      fixture.detectChanges();

      expect(fixture.nativeElement.classList.contains('mini')).toBe(true);
    });

    it('applies non-interactive', () => {
      fixture = TestBed.createComponent(CardPreviewComponent);
      fixture.componentRef.setInput('interactive', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.classList.contains('non-interactive')).toBe(
        true,
      );
      expect(fixture.nativeElement.classList.contains('interactive')).toBe(
        false,
      );
    });
  });
});
