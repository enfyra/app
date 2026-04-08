import { H3Event, getRequestHeader, getRequestURL, proxyRequest } from "h3";
import { normalizeUrl } from "~/utils/api/url";

export function proxyToAPI(event: H3Event, customPath?: string) {
  const config = useRuntimeConfig();
  const rawPath = customPath || event.path.replace(/^\/api/, "");
  const baseTarget = normalizeUrl(config.public.apiUrl, rawPath);
  const incoming = getRequestURL(event);
  const targetUrl = incoming.search ? `${baseTarget}${incoming.search}` : baseTarget;

  const headers: Record<string, string> = {
    ...(event.context.proxyHeaders || {}),
  };
  const accept = getRequestHeader(event, "accept");
  if (accept) {
    headers.accept = accept;
  }

  return proxyRequest(event, targetUrl, {
    headers,
  });
}
