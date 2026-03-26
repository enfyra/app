export function useServerSync() {
  async function retryUntilFresh(
    fetchFn: () => Promise<void>,
    isStale: () => boolean,
    options: { maxRetries?: number; baseDelay?: number } = {}
  ): Promise<void> {
    const { maxRetries = 4, baseDelay = 250 } = options;
    await fetchFn();
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (!isStale()) return;
      await new Promise(r => setTimeout(r, baseDelay * (attempt + 1)));
      await fetchFn();
    }
  }

  return { retryUntilFresh };
}
