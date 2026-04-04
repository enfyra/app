export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const backendUrl = config.public.apiUrl?.replace(/\/+$/, '');

  if (!backendUrl) {
    console.error('[socket.io proxy] API_URL not configured');
    return;
  }

  const reqUrl = event.node.req.url || '';
  const targetUrl = `${backendUrl}${reqUrl}`;

  return proxyRequest(event, targetUrl, {
    headers: {
      ...event.context.proxyHeaders,
    },
  });
});
