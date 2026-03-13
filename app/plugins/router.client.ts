export default defineNuxtPlugin(() => {
  const { setRouteLoading } = useGlobalState();
  const router = useRouter();

  router.onError(() => {
    setRouteLoading(false);
  });
});
