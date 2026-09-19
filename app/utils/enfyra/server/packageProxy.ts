export function buildPackageProxyHeaders(
  cookie: string | undefined,
  authorization: string | undefined,
  pat: string | undefined
): Record<string, string> {
  return {
    ...(cookie ? { cookie } : {}),
    ...(authorization ? { authorization } : {}),
    ...(pat ? { "x-enfyra-pat": pat } : {}),
  };
}
