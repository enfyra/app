import { H3Event, getRequestHeader, proxyRequest } from "h3";
import { normalizeUrl } from "~/utils/api/url";

export function proxyToAPI(event: H3Event, customPath?: string) {
  const config = useRuntimeConfig();
  const rawPath = customPath || event.path.replace(/^\/api/, "");
  const targetUrl = normalizeUrl(config.public.apiUrl, rawPath);

  const headers: Record<string, string> = {
    ...(event.context.proxyHeaders || {}),
  };
  const pathKey = (rawPath || "/").replace(/\/+$/, "") || "/";
  const accept = getRequestHeader(event, "accept");
  if (accept && pathKey === "/graphql") {
    headers.accept = accept;
  }

  return proxyRequest(event, targetUrl, {
    headers,
  });
}
