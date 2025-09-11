export function useApi<T = any>(url: string | (() => string), options?: any) {
  const toast = useToast();

  const { data, pending, error, refresh, execute, status } = useEnfyraApi<T>(
    url,
    {
      ...options,
      onError: (error: any) => {
        const errorMessage =
          error?.data?.message || error?.message || "An error occurred";

        toast.add({
          title: "Error",
          description: errorMessage,
          color: "error",
        });

        if (options?.onError) {
          options.onError(error);
        }
      },
    }
  );

  return {
    data,
    pending,
    error,
    refresh,
    execute,
    status,
  };
}

export function useApiLazy<T = any>(
  url: string | (() => string),
  options?: any
) {
  return useApi<T>(url, {
    ...options,
    immediate: false,
  });
}
