import { filenameFor } from './filename-for.function';

describe('filenameFor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('named file', () => {
    it('keeps the name', () => {
      expect(filenameFor(new File([], 'shop.png', { type: 'image/png' }))).toBe(
        'shop.png',
      );
    });
  });

  describe('unnamed file', () => {
    it('uses a millisecond timestamp', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_735_372_145_123);
      expect(filenameFor(new File([], '', { type: 'image/jpeg' }))).toBe(
        '1735372145123.jpg',
      );
      expect(filenameFor(new File([], '  ', { type: 'image/png' }))).toBe(
        '1735372145123.png',
      );
    });
  });
});
