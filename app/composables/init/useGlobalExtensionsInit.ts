export async function useGlobalExtensionsInit(options: { forceReload?: boolean } = {}) {
  const { loadGlobalExtensions } = useGlobalExtensions();
  await loadGlobalExtensions(options);
}
