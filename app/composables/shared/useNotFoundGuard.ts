import type { Ref } from 'vue';

export function useNotFoundGuard(
  loading: Ref<boolean>,
  hasData: () => boolean,
  statusMessage: string,
) {
  let started = false;
  watch(loading, (isLoading) => {
    if (isLoading) {
      started = true;
      return;
    }
    if (started && !hasData()) {
      showError({ statusCode: 404, statusMessage });
    }
  });
}
