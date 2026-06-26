import {
  Component,
  effect,
  ElementRef,
  inject,
  model,
  output,
  signal,
  viewChild,
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
import { TranslatePipe } from '@ngx-translate/core';
import { ELocalStorageKey } from 'src/app/app.consts';
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

/**
 * Barcode drawing component
 */
@Component({
  selector: 'app-card-code-viewer',
  templateUrl: './card-code-viewer.component.html',
  styleUrl: './card-code-viewer.component.scss',
})
export class CardCodeViewerComponent {
  protected readonly matDialog = inject(MatDialog);

  /**
   * Card info
   */
  public readonly card = model<Partial<ICardBase> | null>(null);
  /**
   * Code scale
   * @default 3
   */
  public readonly scale = model<number>(3);
  /**
   * Background color
   */
  public readonly color = model<string>(
    this.getCssVariableValue('--mat-sys-on-surface'),
  );
  /**
   * Event on new code type.
   * @description
   * Decided to use bwip code types instead of zxing.
   * @deprecated
   * Remove it somewhere in the future.
   */
  public readonly OnNewType = output<string>();

  /**
   * Barcode canvas element ref
   */
  protected readonly canvasRef = viewChild.required<
    unknown,
    ElementRef<HTMLCanvasElement>
  >('canvas', { read: ElementRef });

  constructor() {
    effect(() => {
      const card = this.card();
      const scale = this.scale() || 3;
      const color =
        this.color() || this.getCssVariableValue('--mat-sys-on-surface');
      const canvas = this.canvasRef()?.nativeElement;

      if (card && canvas) {
        this.tryDrawCode(canvas, card.code, card.code_type, color, scale);
      }
    });
  }

  protected getCssVariableValue(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(
      variable,
    );
  }

  protected tryDrawCode(
    canvas: HTMLCanvasElement,
    code: string,
    codeType: string,
    color: string,
    scale: number,
  ): void {
    if (codeType in ZxingToBwipMap) {
      codeType = ZxingToBwipMap[codeType];
      this.OnNewType.emit(codeType);
    }
    try {
      Bwip.toCanvas(canvas, {
        bcid: codeType,
        text: code,
        scale,
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

  protected viewInDialog(): MatDialogRef<
    CardCodeViewerDialogComponent,
    ICardCodeViewerData
  > {
    return this.matDialog.open(CardCodeViewerDialogComponent, {
      width: 'calc(100% - 50px)',
      height: 'calc(100% - 50px)',
      data: {
        card: this.card(),
        scale: this.scale() * 2,
      } as ICardCodeViewerData,
    });
  }
}

@Component({
  selector: 'app-card-code-viewer-dialog',
  imports: [
    MatButton,
    MatIcon,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ card()?.name }}</h2>
    <mat-dialog-content
      class="mat-dialog-content"
      [class.invert]="invert()">
      <canvas
        class="canvas"
        #canvas
        (click)="toggleInvert()">
      </canvas>
      @if (card()?.description; as d) {
        <pre class="desc" [innerHTML]="d"></pre>
      }
    </mat-dialog-content>
    <mat-dialog-actions class="mat-dialog-actions">
      <button
        mat-button
        (click)="toggleInvert()">
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: var(--mat-sys-surface);

      &.invert {
        filter: invert(1);
      }

      .desc {
        font-family: unset;
        margin: 0;
        font-size: 1rem;
      }
    }
    .mat-dialog-actions {
      margin-top: auto;
      gap: 8px;
    }
  }
  `,
})
export class CardCodeViewerDialogComponent extends CardCodeViewerComponent {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: ICardCodeViewerData = inject(MAT_DIALOG_DATA);

  protected readonly invert = signal<boolean>(
    localStorage.getItemJson(ELocalStorageKey.CODE_COLOR_INVERSION),
  );

  constructor() {
    super();
    this.card.set(this.data.card);
    this.scale.set(this.data.scale);
    this.color.set(this.data.color);
  }

  protected toggleInvert(): void {
    const invert = !this.invert();
    this.invert.set(invert);
    localStorage.setItemJson(ELocalStorageKey.CODE_COLOR_INVERSION, invert);
  }

  protected close(): void {
    this.matDialogRef.close();
  }
}
