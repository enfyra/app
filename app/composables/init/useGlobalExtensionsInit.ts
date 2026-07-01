export async function useGlobalExtensionsInit(options: { forceReload?: boolean; throwOnError?: boolean } = {}) {
  const { loadGlobalExtensions } = useGlobalExtensions();
  await loadGlobalExtensions(options);
}
