import { EBwipBcid } from 'src/app/entities/cards/cards-const';

export interface IScannerResult {
  code: string;
  type: EBwipBcid;
}
export enum EScanner {
  ZXING = 'zxing',
  QUAGGA2 = 'quagga2',
}
export interface IScanner {
  name: string;
  code: EScanner;
}
