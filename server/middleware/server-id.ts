import { defineEventHandler, setHeader } from "h3";
const serverId = process.pid;
const startTime = Date.now();

export default defineEventHandler(async (event) => {
  // Only add headers to API routes
  if (event.node.req.url?.startsWith("/api/")) {
    setHeader(event, "X-Server-Id", serverId.toString());
    setHeader(event, "X-Server-Start", startTime.toString());
  }
});