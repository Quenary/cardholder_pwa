import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import Bwip from '@bwip-js/browser';
import { TranslateModule } from '@ngx-translate/core';
import type { BarcodeFormat } from '@zxing/library';
import { ZxingToBwipMap } from 'src/app/entities/cards/cards-const';
import { ICardBase } from 'src/app/entities/cards/cards-interface';

export interface ICardCodeViewerData {
  /**
   * Card data
   */
  card: Partial<ICardBase>;
  /**
   * Scale of the code
   * @default 3
   */
  scale: number;
  /**
   * Color of barcode.
   * @default value of var(--mat-sys-on-background)
   */
  color: string;
}

@Component({
  selector: 'app-card-code-viewer',
  standalone: true,
  templateUrl: './card-code-viewer.component.html',
  styleUrl: './card-code-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCodeViewerComponent
  implements OnInit, OnChanges, ICardCodeViewerData
{
  protected readonly matDialog = inject(MatDialog);
  @Input() card: Partial<ICardBase> = null;
  @Input() scale: number = 3;
  @Input('color') set _color(value: string) {
    if (value) {
      this.color = value;
    }
  }
  color: string = getComputedStyle(document.documentElement).getPropertyValue(
    '--mat-sys-on-background'
  );
  /**
   * Barcode canvas element ref
   */
  @ViewChild('canvas', { read: ElementRef<HTMLCanvasElement>, static: true })
  private readonly canvasRef: ElementRef<HTMLCanvasElement>;

  ngOnInit(): void {
    if (this.card) {
      this.tryDrawCode(this.card.code, this.card.code_type);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.card) {
      this.tryDrawCode(this.card.code, this.card.code_type);
    }
  }

  protected tryDrawCode(text: string, format: string): void {
    const canvas = this.canvasRef.nativeElement;
    try {
      const bcid = ZxingToBwipMap[format as keyof typeof BarcodeFormat];
      Bwip.toCanvas(canvas, {
        bcid,
        text,
        scale: 3,
        includetext: true,
        textcolor: this.color,
        barcolor: this.color,
      });
    } catch (e) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.error(e);
    }
  }

  public viewInDialog() {
    this.matDialog.open(CardCodeViewerDialogComponent, {
      width: 'calc(100% - 50px)',
      height: 'calc(100% - 50px)',
      data: <ICardCodeViewerData>{
        card: this.card,
        scale: this.scale * 2,
      },
    });
  }
}

@Component({
  selector: 'app-card-code-viewer-dialog',
  standalone: true,
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ card.name }}</h2>
    <mat-dialog-content>
      <canvas
        class="canvas"
        #canvas>
      </canvas>
    </mat-dialog-content>
    <mat-dialog-actions [style.margin-top]="'auto'">
      <button
        mat-button
        (click)="close()">
        {{ 'GENERAL.CLOSE' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styleUrl: './card-code-viewer.component.scss',
  styles: `
  mat-dialog-content {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCodeViewerDialogComponent extends CardCodeViewerComponent {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: ICardCodeViewerData = inject(MAT_DIALOG_DATA);
  constructor() {
    super();
    Object.assign(this, this.data);
  }
  public close() {
    this.matDialogRef.close();
  }
}
