import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import Bwip from '@bwip-js/browser';

@Component({
  selector: 'app-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent {
  public readonly value = input.required<string>();
  public readonly size = input(180);

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect(() => {
      const value = this.value();
      const size = this.size();
      const canvas = this.canvas()?.nativeElement;
      untracked(() => {
        if (!canvas || !value) {
          return;
        }
        Bwip.toCanvas(canvas, {
          bcid: 'qrcode',
          text: value,
          scale: 3,
          width: size,
          height: size,
          // The light modules are otherwise transparent and disappear on a
          // dark surface.
          backgroundcolor: 'FFFFFF',
        });
      });
    });
  }
}
