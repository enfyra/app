import {
  createError,
  defineEventHandler,
  getQuery,
  sendRedirect,
  setResponseHeaders,
} from "h3";
import { ENFYRA_API_PREFIX } from "~/constants/enfyra";
import { proxyToAPI } from "~/utils/enfyra/server/proxy";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, CORS_HEADERS);

  if (event.method === "OPTIONS") {
    return "";
  }

  return proxyToAPI(event);
});
