export function useInitialLoading() {
  const initialReady = useState<boolean>("app:initial-loading:ready", () => false);

  function markInitialReady() {
    initialReady.value = true;
  }

  return {
    initialReady,
    markInitialReady,
  };
}
