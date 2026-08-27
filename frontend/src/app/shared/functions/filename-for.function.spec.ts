import { filenameFor } from './filename-for.function';

describe('filenameFor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should keep a real name', () => {
    expect(filenameFor(new File([], 'shop.png', { type: 'image/png' }))).toBe(
      'shop.png',
    );
  });

  it('should invent a millisecond name when the file has none', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_735_372_145_123);
    expect(filenameFor(new File([], '', { type: 'image/jpeg' }))).toBe(
      '1735372145123.jpg',
    );
    expect(filenameFor(new File([], '  ', { type: 'image/png' }))).toBe(
      '1735372145123.png',
    );
  });
});
