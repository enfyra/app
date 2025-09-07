export const useMounted = () => {
  const isMounted = ref(false);

  onMounted(() => {
    nextTick(() => {
      isMounted.value = true;
    });
  });

  return {
    isMounted: readonly(isMounted),
  };
};
