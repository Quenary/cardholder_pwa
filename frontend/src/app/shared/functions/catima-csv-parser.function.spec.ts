import { describe, it, expect } from 'vitest';
import {
  catimaColorToHex,
  mapBarcodeType,
  parseCatimaCsv,
  parseCsvLine,
  splitCsvRows,
} from './catima-csv-parser.function';

describe('catima-csv-parser.function', () => {
  describe('catimaColorToHex', () => {
    it('converts negative 32-bit integer colors correctly', () => {
      expect(catimaColorToHex('-957596')).toBe('#f16364');
      expect(catimaColorToHex('-7288346')).toBe('#90c9e6');
      expect(catimaColorToHex('-10902850')).toBe('#59a2be');
      expect(catimaColorToHex('-26935')).toBe('#ff96c9');
    });

    it('handles hex colors or null/empty', () => {
      expect(catimaColorToHex('#123456')).toBe('#123456');
      expect(catimaColorToHex('')).toBeNull();
      expect(catimaColorToHex(null)).toBeNull();
      expect(catimaColorToHex('invalid')).toBeNull();
    });
  });

  describe('mapBarcodeType', () => {
    it('maps known ZXing/Catima barcode types to bwip bcid', () => {
      expect(mapBarcodeType('PDF_417')).toBe('pdf417');
      expect(mapBarcodeType('UPC_A')).toBe('upca');
      expect(mapBarcodeType('CODE_128')).toBe('code128');
      expect(mapBarcodeType('QR_CODE')).toBe('qrcode');
      expect(mapBarcodeType('EAN_13')).toBe('ean13');
      expect(mapBarcodeType('DATA_MATRIX')).toBe('datamatrix');
      expect(mapBarcodeType('AZTEC')).toBe('azteccode');
    });

    it('falls back to code128 for unknown/empty', () => {
      expect(mapBarcodeType('')).toBe('code128');
      expect(mapBarcodeType(null)).toBe('code128');
    });
  });

  describe('parseCsvLine', () => {
    it('parses commas and quotes properly', () => {
      const line = '20,"Sample Store, Inc","Hello ""World""",PDF_417';
      expect(parseCsvLine(line)).toEqual([
        '20',
        'Sample Store, Inc',
        'Hello "World"',
        'PDF_417',
      ]);
    });
  });

  describe('splitCsvRows', () => {
    it('splits rows respecting multiline quotes', () => {
      const csv = 'a,b\n"c\nd",e\nf,g';
      expect(splitCsvRows(csv)).toEqual(['a,b', '"c\nd",e', 'f,g']);
    });
  });

  describe('parseCatimaCsv', () => {
    const sampleCsv = `2,,,,,,,,,,,,,,
,,,,,,,,,,,,,,
_id,,,,,,,,,,,,,,
most used,,,,,,,,,,,,,,
,,,,,,,,,,,,,,
_id,store,note,validfrom,expiry,balance,balancetype,cardid,barcodeid,barcodetype,barcodeencoding,headercolor,starstatus,lastused,archive
20,Store Alpha,,,,0,,1000000000000001,,PDF_417,ISO-8859-1,-957596,1,1792296418,0
6,Store Beta,,,,0,,200000000002,,UPC_A,ISO-8859-1,-7288346,0,1778813412,0
9,Store Gamma,,,,0,,30000000003,,UPC_A,ISO-8859-1,-10902850,0,1715455654,0
14,Store Delta,,,,0,,40000000004,,CODE_128,ISO-8859-1,-26935,0,0,0
,,,,,,,,,,,,,,
cardId,groupId,,,,,,,,,,,,,
4,most used,,,,,,,,,,,,,
19,most used,,,,,,,,,,,,,`;

    it('parses sample catima csv accurately', () => {
      const cards = parseCatimaCsv(sampleCsv);
      expect(cards.length).toBe(4);

      expect(cards[0]).toEqual({
        name: 'Store Alpha',
        code: '1000000000000001',
        code_type: 'pdf417',
        description: '',
        color: '#f16364',
        is_favorite: true,
        used_at: new Date(1792296418 * 1000).toISOString(),
      });

      expect(cards[1]).toEqual({
        name: 'Store Beta',
        code: '200000000002',
        code_type: 'upca',
        description: '',
        color: '#90c9e6',
        is_favorite: false,
        used_at: new Date(1778813412 * 1000).toISOString(),
      });

      expect(cards[2]).toEqual({
        name: 'Store Gamma',
        code: '30000000003',
        code_type: 'upca',
        description: '',
        color: '#59a2be',
        is_favorite: false,
        used_at: new Date(1715455654 * 1000).toISOString(),
      });

      expect(cards[3]).toEqual({
        name: 'Store Delta',
        code: '40000000004',
        code_type: 'code128',
        description: '',
        color: '#ff96c9',
        is_favorite: false,
      });
    });

    it('returns empty array when no valid headers found', () => {
      expect(parseCatimaCsv('')).toEqual([]);
      expect(parseCatimaCsv('foo,bar\n1,2')).toEqual([]);
    });
  });
});
