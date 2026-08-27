const FALLBACK_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
};

/**
 * Filename for a multipart upload. Never empty: iOS WKWebView often hands
 * over a File with no name, and FastAPI then 422s the part.
 * @param file file
 */
export const filenameFor = (file: File): string => {
  const name = file.name?.trim();
  if (name) {
    return name;
  }
  return `${Date.now()}${FALLBACK_EXTENSIONS[file.type] ?? ''}`;
};
