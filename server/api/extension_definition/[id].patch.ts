import {
  defineEventHandler,
  readBody,
  getHeader,
  createError,
} from "h3";
import { useRuntimeConfig } from "#imports";
import { $fetch } from "ofetch";
import {
  processExtensionDefinition,
} from "../../../utils/server/extension";

export default defineEventHandler(async (event) => {
  const method = event.method;

  try {
    let body = await readBody(event);

    const { processedBody, compiledCode } = await processExtensionDefinition(body, method);
    body = processedBody;

    const config = useRuntimeConfig();
    const apiPath = event.path.replace("/enfyra/api", "");
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