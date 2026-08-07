import type { Ref } from 'vue';

type RequestError = { status?: number } | null;

export function useNotFoundGuard(
  loading: Ref<boolean>,
  hasData: () => boolean,
  statusMessage: string,
  requestError?: Ref<RequestError>,
) {
  let started = false;
  watch(loading, (isLoading) => {
    if (isLoading) {
      started = true;
      return;
    }
    if (started && !hasData() && !requestError?.value) {
      showError({ statusCode: 404, statusMessage });
    }
  });
}
