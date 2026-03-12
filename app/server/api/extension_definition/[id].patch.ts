import {
  defineEventHandler,
  readBody,
  getHeader,
  createError,
} from "h3";
// @ts-ignore
import { useRuntimeConfig } from "#imports";
import { $fetch } from "ofetch";

export default defineEventHandler(async (event) => {
  const method = event.method;

  try {
    const body = await readBody(event);

    const config = useRuntimeConfig();
    const apiPath = event.path.replace("/api", "");
    const targetUrl = `${config.public?.enfyraSDK?.apiUrl}${apiPath}`;

    const response = await $fetch(targetUrl, {
      method: "PATCH",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization || "",
        "Content-Type": "application/json",
      },
      body: body || undefined,
    });

    return response;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage:
        error.message || `Failed to process extension definition ${method}`,
    });
  }
});
