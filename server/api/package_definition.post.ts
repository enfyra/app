import {
  defineEventHandler,
  readBody,
  getHeader,
  createError,
} from "h3";
import { $fetch } from "ofetch";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const config = useRuntimeConfig();
    const apiUrl = (config.public as any).apiUrl;
    const headers = {
      cookie: getHeader(event, "cookie") || "",
      authorization: event.context.proxyHeaders?.authorization || "",
    };

    const finalBody = body.type === "App"
      ? { ...body, status: "installed" }
      : body;

    return await $fetch(`${apiUrl}/package_definition`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: finalBody,
    });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: error.message || "Failed to process package definition" });
  }
});
