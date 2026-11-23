import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { QrCodeComponent } from './qr-code.component';

vi.mock('@bwip-js/browser', () => ({
  default: {
    toCanvas: vi.fn(),
  },
}));

describe('QrCodeComponent', () => {
  let fixture: ComponentFixture<QrCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
  });

  it('draws the value', async () => {
    const Bwip = (await import('@bwip-js/browser')).default;
    fixture = TestBed.createComponent(QrCodeComponent);
    fixture.componentRef.setInput('value', 'otpauth://totp/Cardholder:ada');
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.tick();

    expect(Bwip.toCanvas).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({
        bcid: 'qrcode',
        text: 'otpauth://totp/Cardholder:ada',
        backgroundcolor: 'FFFFFF',
      }),
    );
  });
});
