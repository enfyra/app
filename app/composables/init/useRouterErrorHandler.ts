export function useRouterErrorHandler() {
  const { setRouteLoading } = useGlobalState();
  const router = useRouter();

  router.onError(() => {
    setRouteLoading(false);
  });
}
