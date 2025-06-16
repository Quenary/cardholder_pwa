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
import { MatIcon } from '@angular/material/icon';
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
   * It should be valid css color value (not variable).
   * @default value of var(--mat-sys-on-surface)
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
  color: string = this.getCssVariableValue('--mat-sys-on-surface');
  /**
   * Barcode canvas element ref
   */
  @ViewChild('canvas', { read: ElementRef<HTMLCanvasElement>, static: true })
  private readonly canvasRef: ElementRef<HTMLCanvasElement>;

  ngOnInit(): void {
    if (this.card) {
      this.tryDrawCode(this.card.code, this.card.code_type, this.color);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.card) {
      this.tryDrawCode(this.card.code, this.card.code_type, this.color);
    }
  }

  protected getCssVariableValue(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(
      variable
    );
  }

  protected tryDrawCode(text: string, format: string, color: string): void {
    const canvas = this.canvasRef.nativeElement;
    try {
      const bcid = ZxingToBwipMap[format as keyof typeof BarcodeFormat];
      Bwip.toCanvas(canvas, {
        bcid,
        text,
        scale: 3,
        includetext: true,
        textcolor: color,
        barcolor: color,
      });
    } catch (e) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.error(e);
    }
  }

  public viewInDialog(): MatDialogRef<
    CardCodeViewerDialogComponent,
    ICardCodeViewerData
  > {
    return this.matDialog.open(CardCodeViewerDialogComponent, {
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
    MatIcon,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ card.name }}</h2>
    <mat-dialog-content
      class="mat-dialog-content"
      [class.invert]="invert">
      <canvas
        class="canvas"
        #canvas
        (click)="invert = !invert">
      </canvas>
    </mat-dialog-content>
    <mat-dialog-actions class="mat-dialog-actions">
      <button mat-button
        (click)="invert = !invert">
        <mat-icon>touch_app</mat-icon>
        {{ 'CARDS.VIEWER.INVERT' | translate }}
      </button>
      <button
        mat-flat-button
        (click)="close()">
        {{ 'GENERAL.CLOSE' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styleUrl: './card-code-viewer.component.scss',
  styles: `
  :host {
    .mat-dialog-content {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--mat-sys-surface);

      &.invert {
        filter: invert(1);
      }
    }
    .mat-dialog-actions {
      margin-top: auto;
      gap: 8px;
    }
  }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCodeViewerDialogComponent extends CardCodeViewerComponent {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: ICardCodeViewerData = inject(MAT_DIALOG_DATA);

  public invert: boolean = false;

  constructor() {
    super();
    Object.assign(this, this.data);
  }

  public close() {
    this.matDialogRef.close();
  }
}
