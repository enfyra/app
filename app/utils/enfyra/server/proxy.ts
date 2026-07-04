import { H3Event, getRequestHeader, proxyRequest } from "h3";

export function buildApiProxyTarget(baseUrl: string | undefined, rawPath: string): string {
  const base = (baseUrl || "").replace(/\/+$/, "");
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${base}${path}`;
}

export function proxyToAPI(event: H3Event, customPath?: string) {
  const config = useRuntimeConfig();
  const rawPath = customPath || event.path.replace(/^\/api/, "");
  const targetUrl = buildApiProxyTarget(config.public.apiUrl, rawPath);

  const headers: Record<string, string> = {
    ...(event.context.proxyHeaders || {}),
  };
  const accept = getRequestHeader(event, "accept");
  if (accept) headers.accept = accept || "";

  return proxyRequest(event, targetUrl, {
    headers,
    streamRequest: true,
    fetchOptions: {
      redirect: "manual",
    },
  });
}
