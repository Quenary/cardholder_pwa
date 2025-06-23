import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ICardBase } from 'src/app/entities/cards/cards-interface';
import { CardCodeViewerComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';

@Component({
  selector: 'app-code-examples',
  imports: [CardCodeViewerComponent],
  templateUrl: './code-examples.component.html',
  styleUrl: './code-examples.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeExamplesComponent {
  public readonly barcodeExamples: Partial<ICardBase>[] = [
    { code: '01234567', code_type: 'azteccode', name: 'azteccode (AZTEC)' },
    {
      code: 'ABC1234567890',
      code_type: 'datamatrix',
      name: 'datamatrix (DATA_MATRIX)',
    },
    {
      code: 'RS01GS100450000GS840GS001GS1234567890EOT',
      code_type: 'maxicode',
      name: 'maxicode (MAXICODE)',
    },
    {
      code: 'ABC12345678901234567890',
      code_type: 'pdf417',
      name: 'pdf417 (PDF_417)',
    },
    {
      code: 'https://example.com',
      code_type: 'qrcode',
      name: 'qrcode (QR_CODE)',
    },
    {
      code: 'A123456A',
      code_type: 'rationalizedCodabar',
      name: 'rationalizedCodabar (CODABAR)',
    },
    { code: 'CODE39', code_type: 'code39', name: 'code39 (CODE_39)' },
    { code: 'CODE93DATA', code_type: 'code93', name: 'code93 (CODE_93)' },
    { code: '123456789012', code_type: 'code128', name: 'code128 (CODE_128)' },
    { code: '1234567', code_type: 'ean8', name: 'ean8 (EAN_8)' },
    { code: '1234567890128', code_type: 'ean13', name: 'ean13 (EAN_13)' },
    {
      code: '12345670',
      code_type: 'interleaved2of5',
      name: 'interleaved2of5 (ITF)',
    },
    { code: '01234567890', code_type: 'upca', name: 'upca (UPC_A)' },
    { code: '01234565', code_type: 'upce', name: 'upce (UPC_E)' },
  ];
}
