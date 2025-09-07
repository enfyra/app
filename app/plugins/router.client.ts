export default defineNuxtPlugin(() => {
  const { setRouteLoading } = useGlobalState();
  const router = useRouter();

  router.beforeEach(() => {
    setRouteLoading(true);
  });

  router.afterEach(() => {
    nextTick(() => {
      setRouteLoading(false);
    });
  });

  router.onError(() => {
    setRouteLoading(false);
  });
});
