import { ref, readonly } from 'vue';

const activeRequests = ref(0);

export function useAppActivity() {
  return {
    activeRequests: readonly(activeRequests),
    beginRequest() {
      activeRequests.value++;
      let ended = false;
      return () => {
        if (ended) return;
        ended = true;
        activeRequests.value--;
      };
    },
  };
}
