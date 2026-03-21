import { H3Event, proxyRequest } from "h3";
import { normalizeUrl } from "~/utils/api/url";

export function proxyToAPI(event: H3Event, customPath?: string) {
  const config = useRuntimeConfig();
  const rawPath = customPath || event.path.replace(/^\/api/, "");
  const targetUrl = normalizeUrl(config.public.apiUrl, rawPath);

  const headers = event.context.proxyHeaders || {};

  return proxyRequest(event, targetUrl, {
    headers,
  });
}
