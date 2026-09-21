import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { type H3Event, getRequestHeader, proxyRequest } from "h3";

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
  };
  const accept = getRequestHeader(event, "accept");
  if (accept) headers.accept = accept || "";
  const uploadId = getRequestHeader(event, "x-enfyra-upload-id");
  if (uploadId) headers["x-enfyra-upload-id"] = uploadId;

  const controller = new AbortController();
  const abort = () => {
    if (!event.node.res.writableEnded) controller.abort();
  };
  event.node.req.once("aborted", abort);
  event.node.res.once("close", abort);
  if (event.node.req.aborted || event.node.res.destroyed) abort();

  try {
    return await proxyRequest(event, targetUrl, {
      headers,
      streamRequest: true,
      fetchOptions: {
        redirect: "manual",
        signal: controller.signal,
      },
      onResponse: async (_event, response) => {
        if (response.body) {
          await pipeline(Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>), event.node.res, {
            signal: controller.signal,
          });
        } else {
          event.node.res.end();
        }
      },
    });
  } catch (error) {
    if (controller.signal.aborted || event.node.res.destroyed) return;
    throw error;
  } finally {
    event.node.req.off("aborted", abort);
    event.node.res.off("close", abort);
  }
}
