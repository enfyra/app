import { defineEventHandler, setHeader } from "h3";
const serverId = process.pid;
const startTime = Date.now();

export default defineEventHandler(async (event) => {
  // Add headers to all API routes (including /enfyra/api/, /api/, etc.)
  const url = event.node.req.url || "";
  if (url.includes("/api/")) {
    setHeader(event, "X-Server-Id", serverId.toString());
    setHeader(event, "X-Server-Start", startTime.toString());
  }
});