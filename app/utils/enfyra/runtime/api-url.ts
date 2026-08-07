export function resolvePublicApiUrl(env: Record<string, string | undefined>): string | undefined {
  return (env.NUXT_PUBLIC_API_URL || env.API_URL)?.replace(/\/+$/, '')
}
