import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { type H3Event, getRequestHeader, proxyRequest } from "h3";
import { buildForwardedHeaders } from "./forwardedHeaders";
import { beginProxyDelivery, deliveryHopHeader } from "./proxyDelivery";

export function buildApiProxyTarget(baseUrl: string | undefined, rawPath: string): string {
  const base = (baseUrl || "").replace(/\/+$/, "");
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${base}${path}`;
}

export async function proxyToAPI(event: H3Event, customPath?: string) {
  const config = useRuntimeConfig();
  const rawPath = customPath || event.path.replace(/^\/api/, "");
  const targetUrl = buildApiProxyTarget(config.public.apiUrl, rawPath);

  const headers: Record<string, string> = {
    ...(event.context.proxyHeaders || {}),
    ...buildForwardedHeaders(event.node.req),
  };
  const accept = getRequestHeader(event, "accept");
  if (accept) headers.accept = accept || "";
  const uploadId = getRequestHeader(event, "x-enfyra-upload-id");
  if (uploadId) headers["x-enfyra-upload-id"] = uploadId;

  const delivery = beginProxyDelivery(event, 'eapp');
  headers[deliveryHopHeader] = delivery.snapshot.hopId;
  const controller = new AbortController();
  const abort = () => {
    if (!event.node.res.writableEnded) controller.abort();
  };
  const onAborted = () => {
    delivery.failure('downstream', 'response', 'request_aborted');
    abort();
  };
  const onClose = () => {
    delivery.mark('response_close');
    if (!event.node.res.writableEnded) delivery.failure('downstream', 'response', 'response_close');
    abort();
    delivery.report();
  };
  const onError = (error: Error) => delivery.failure('downstream', 'response', 'response_error', error);
  const onFinish = () => delivery.mark('response_finish');
  event.node.req.once("aborted", onAborted);
  event.node.res.once("close", onClose);
  event.node.res.once('error', onError);
  event.node.res.once('finish', onFinish);
  if (event.node.req.aborted || event.node.res.destroyed) onAborted();

  try {
    return await proxyRequest(event, targetUrl, {
      headers,
      streamRequest: true,
      fetchOptions: {
        redirect: "manual",
        signal: controller.signal,
      },
      onResponse: async (_event, response) => {
        event.node.res.removeHeader(deliveryHopHeader);
        delivery.snapshot.upstreamStatusCode = response.status;
        delivery.mark('upstream_headers');
        if (response.body) {
          const source = Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>);
          source.on('data', (chunk: Buffer) => delivery.chunk(chunk.byteLength));
          source.once('error', error => delivery.failure('upstream', 'body', 'source_error', error));
          source.once('end', () => delivery.mark('source_end'));
          try {
            await pipeline(source, event.node.res, { signal: controller.signal });
            delivery.mark('relay_end');
          } catch (error) {
            delivery.failure('bridge', 'body', 'relay_error', error);
            throw error;
          }
        } else {
          event.node.res.end();
        }
      },
    });
  } catch (error) {
    delivery.failure('upstream', delivery.snapshot.upstreamStatusCode === undefined ? 'headers' : 'body', 'proxy_error', error);
    if (controller.signal.aborted || event.node.res.destroyed) return;
    throw error;
  } finally {
    delivery.report();
    event.node.req.off("aborted", onAborted);
    event.node.res.off("close", onClose);
    event.node.res.off('error', onError);
    event.node.res.off('finish', onFinish);
  }
}
