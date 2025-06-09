import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import Bwip from '@bwip-js/browser';
import type { BarcodeFormat } from '@zxing/library';
import { ZxingToBwipMap } from 'src/app/entities/cards/cards-const';

// TODO add dialog component with code

@Component({
  selector: 'app-card-code-viewer',
  imports: [],
  templateUrl: './card-code-viewer.component.html',
  styleUrl: './card-code-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCodeViewerComponent implements OnInit, OnChanges {
  /**
   * Code content
   */
  @Input() code: string;
  /**
   * Code type
   */
  @Input() code_type: string;
  /**
   * Color of barcode.
   * @default --mat-sys-on-primary-containe
   */
  @Input() color: string = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--mat-sys-on-primary-container');
  /**
   * Barcode canvas element ref
   */
  @ViewChild('canvas', { read: ElementRef<HTMLCanvasElement>, static: true })
  private readonly canvasRef: ElementRef<HTMLCanvasElement>;

  ngOnInit(): void {
    this.tryDrawCode(this.code, this.code_type);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.tryDrawCode(this.code, this.code_type);
  }

  private tryDrawCode(text: string, format: string): void {
    try {
      const canvas = this.canvasRef.nativeElement;
      // const ctx = canvas.getContext('2d');
      // ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bcid = ZxingToBwipMap[format as keyof typeof BarcodeFormat];
      Bwip.toCanvas(canvas, {
        bcid,
        text,
        // scale: 3,
        includetext: true,
        barcolor: this.color,
      });
    } catch (e) {
      console.error(e);
    }
  }

  public viewInDialog() {}
}
