/**
 * Drops the API responses the service worker keeps for offline use.
 *
 * The data groups in ngsw-config.json hold card codes for 90 days. That is
 * what makes the app readable offline, but it should not outlive the
 * session on a shared device. Asset caches are left alone, so the app still
 * opens without a network.
 *
 * Cache names are an internal detail of the Angular service worker, of the
 * form `ngsw:<scope>:<version>:data:<group>:cache`, hence the loose match.
 */
export const clearApiCache = async (): Promise<void> => {
  if (typeof caches === 'undefined') {
    return;
  }
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('ngsw:') && name.includes(':data:'))
        .map((name) => caches.delete(name)),
    );
  } catch {
    // Best effort: logging out must not hang on cache eviction.
  }
};
