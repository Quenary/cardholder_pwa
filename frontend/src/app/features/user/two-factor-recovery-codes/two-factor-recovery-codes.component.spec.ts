import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { TwoFactorRecoveryCodesComponent } from './two-factor-recovery-codes.component';

describe('TwoFactorRecoveryCodesComponent', () => {
  let fixture: ComponentFixture<TwoFactorRecoveryCodesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorRecoveryCodesComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
  });

  describe('download', () => {
    it('keeps the file available until the browser can read it', () => {
      vi.useFakeTimers();
      const create = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:codes');
      const revoke = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => undefined);
      let attached = false;
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          attached = document.body.contains(this);
        });
      try {
        fixture = TestBed.createComponent(TwoFactorRecoveryCodesComponent);
        fixture.componentRef.setInput('codes', ['AAAAA-BBBBB', 'CCCCC-DDDDD']);
        fixture.detectChanges();

        fixture.componentInstance['download']();

        expect(click).toHaveBeenCalledOnce();
        expect(attached).toBe(true);
        expect(document.body.querySelector('a')).toBeNull();
        expect(create).toHaveBeenCalled();
        expect(revoke).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);

        expect(revoke).toHaveBeenCalledWith('blob:codes');
      } finally {
        vi.useRealTimers();
        click.mockRestore();
        create.mockRestore();
        revoke.mockRestore();
      }
    });
  });
});
