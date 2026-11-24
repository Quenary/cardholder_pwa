import { ICardBase } from '../../entities/cards/cards-interface';
import {
  isValidCodeType,
  ZxingToBwipMap,
} from '../../entities/cards/cards-const';

/**
 * Parses a single CSV line taking quotes into account.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    i++;
  }
  result.push(current.trim());
  return result;
}

/**
 * Splits CSV content into rows, respecting multiline quoted strings.
 */
export function splitCsvRows(content: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
        i++;
      }
      if (current.trim().length > 0) {
        rows.push(current);
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    rows.push(current);
  }

  return rows;
}

/**
 * Converts Catima signed integer color to hex format #RRGGBB
 */
export function catimaColorToHex(
  colorVal: string | number | null | undefined,
): string | null {
  if (colorVal === null || colorVal === undefined || colorVal === '') {
    return null;
  }
  const str = String(colorVal).trim();
  if (str.startsWith('#')) {
    if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(str)) {
      return str.toLowerCase();
    }
    return null;
  }
  const parsed = parseInt(str, 10);
  if (isNaN(parsed)) {
    return null;
  }
  const hex = (parsed & 0xffffff).toString(16).padStart(6, '0').toLowerCase();
  return `#${hex}`;
}

/**
 * Normalizes barcode format from Catima/ZXing to bwip-compatible code type.
 */
export function mapBarcodeType(catimaType: string | null | undefined): string {
  if (!catimaType) {
    return 'code128';
  }
  const normalized = catimaType.trim().toUpperCase();

  // Direct mapping or through ZxingToBwipMap
  if (normalized in ZxingToBwipMap) {
    const bwipKey = ZxingToBwipMap[normalized as keyof typeof ZxingToBwipMap];
    if (bwipKey) {
      return bwipKey;
    }
  }

  // Handle common variations
  const lower = normalized.toLowerCase().replace(/[-_]/g, '');
  if (lower === 'pdf417') return 'pdf417';
  if (lower === 'qrcode' || lower === 'qr') return 'qrcode';
  if (lower === 'upca') return 'upca';
  if (lower === 'upce') return 'upce';
  if (lower === 'ean13') return 'ean13';
  if (lower === 'ean8') return 'ean8';
  if (lower === 'code128') return 'code128';
  if (lower === 'code39') return 'code39';
  if (lower === 'code93') return 'code93';
  if (lower === 'datamatrix') return 'datamatrix';
  if (lower === 'aztec') return 'azteccode';
  if (lower === 'codabar') return 'rationalizedCodabar';
  if (lower === 'itf') return 'interleaved2of5';

  if (isValidCodeType(catimaType.trim())) {
    return catimaType.trim();
  }

  return 'code128';
}

/**
 * Parses Catima CSV export content into an array of ICardBase objects.
 */
export function parseCatimaCsv(csvContent: string): ICardBase[] {
  const lines = splitCsvRows(csvContent);
  if (lines.length === 0) {
    return [];
  }

  // Find the header row containing '_id' and 'store'
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const lowerCols = row.map((c) => c.toLowerCase());
    if (lowerCols.includes('store') && lowerCols.includes('_id')) {
      headerIndex = i;
      headers = lowerCols;
      break;
    }
  }

  if (headerIndex === -1) {
    // If no explicit catima header is found, check if line 0 has standard headers
    const firstRow = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
    if (firstRow.includes('store') || firstRow.includes('name')) {
      headerIndex = 0;
      headers = firstRow;
    } else {
      return [];
    }
  }

  const colIdx = {
    store:
      headers.indexOf('store') !== -1
        ? headers.indexOf('store')
        : headers.indexOf('name'),
    cardid:
      headers.indexOf('cardid') !== -1
        ? headers.indexOf('cardid')
        : headers.indexOf('code'),
    barcodeid: headers.indexOf('barcodeid'),
    barcodetype:
      headers.indexOf('barcodetype') !== -1
        ? headers.indexOf('barcodetype')
        : headers.indexOf('code_type'),
    note:
      headers.indexOf('note') !== -1
        ? headers.indexOf('note')
        : headers.indexOf('description'),
    headercolor:
      headers.indexOf('headercolor') !== -1
        ? headers.indexOf('headercolor')
        : headers.indexOf('color'),
    starstatus:
      headers.indexOf('starstatus') !== -1
        ? headers.indexOf('starstatus')
        : headers.indexOf('is_favorite'),
    lastused:
      headers.indexOf('lastused') !== -1
        ? headers.indexOf('lastused')
        : headers.indexOf('used_at'),
  };

  const cards: ICardBase[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    // If row starts with cardId (which marks group associations section) or has no data, stop/skip
    if (
      row.length === 0 ||
      (row[0].toLowerCase() === 'cardid' && row[1]?.toLowerCase() === 'groupid')
    ) {
      break;
    }

    const store = colIdx.store !== -1 ? (row[colIdx.store] ?? '').trim() : '';
    // Prefer barcodeid if provided and not empty, otherwise cardid
    const barcodeVal =
      colIdx.barcodeid !== -1 && row[colIdx.barcodeid]?.trim()
        ? row[colIdx.barcodeid].trim()
        : colIdx.cardid !== -1
          ? (row[colIdx.cardid] ?? '').trim()
          : '';

    // If both store and code are empty, skip row
    if (!store && !barcodeVal) {
      continue;
    }

    const name = store || 'Unnamed Card';
    const code = barcodeVal || '0';
    const rawType = colIdx.barcodetype !== -1 ? row[colIdx.barcodetype] : '';
    const codeType = mapBarcodeType(rawType);

    const note = colIdx.note !== -1 ? (row[colIdx.note] ?? '').trim() : '';
    const rawColor = colIdx.headercolor !== -1 ? row[colIdx.headercolor] : null;
    const color = catimaColorToHex(rawColor);

    const starVal =
      colIdx.starstatus !== -1 ? (row[colIdx.starstatus] ?? '').trim() : '';
    const isFavorite = starVal === '1' || starVal.toLowerCase() === 'true';

    let usedAt: string | undefined = undefined;
    if (colIdx.lastused !== -1 && row[colIdx.lastused]) {
      const ts = parseInt(row[colIdx.lastused].trim(), 10);
      if (!isNaN(ts) && ts > 0) {
        // Catima exports unix timestamp in seconds
        usedAt = new Date(ts * 1000).toISOString();
      }
    }

    const card: ICardBase = {
      name: name.slice(0, 200),
      code: code.slice(0, 4096),
      code_type: codeType,
      description: note ? note.slice(0, 2000) : '',
      color: color ?? '#ffffff',
      is_favorite: isFavorite,
      ...(usedAt ? { used_at: usedAt } : {}),
    };

    cards.push(card);
  }

  return cards;
}
