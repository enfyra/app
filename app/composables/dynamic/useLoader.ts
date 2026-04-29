import type { ComputedRef } from 'vue';

export type Loader = {
  isLoading: ComputedRef<boolean>;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
};

export const useLoader = () => {
  const createLoader = (): Loader => {
    const loadingState = ref(false);

    const isLoading = computed(() => loadingState.value);

    const startLoading = () => {
      loadingState.value = true;
    };
    const stopLoading = () => {
      loadingState.value = false;
    };

    const withLoading = async <T>(fn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        return await fn();
      } finally {
        stopLoading();
      }
    };

    return {
      isLoading,
      startLoading,
      stopLoading,
      withLoading,
    };
  };

  return {
    createLoader,
  };
};

export function useKeyedLoaders() {
  const { createLoader } = useLoader();
  const loaders = new Map<string, Loader>();

  function getLoader(key: string | number | null | undefined): Loader {
    const normalized = String(key ?? '');
    let loader = loaders.get(normalized);
    if (!loader) {
      loader = createLoader();
      loaders.set(normalized, loader);
    }
    return loader;
  }

  return {
    getLoader,
  };
}
