import { defineNitroPlugin } from "nitropack/runtime";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { defineEventHandler } from "h3";
import { useRuntimeConfig } from "#imports";
import { $fetch } from "ofetch";
import { isAccessTokenExpired } from "@enfyra/sdk-nuxt/runtime/utils/server/refreshToken";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "@enfyra/sdk-nuxt/runtime/constants/auth";

const WS_PREFIX = "/ws";

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]?.trim() ?? "") : null;
}

async function resolveAccessToken(
  cookieHeader: string | undefined,
  authFromClient: Record<string, unknown> | undefined,
  apiUrl: string
): Promise<string | null> {
  const tokenFromAuth = authFromClient?.token;
  if (typeof tokenFromAuth === "string" && tokenFromAuth && !isAccessTokenExpired(tokenFromAuth)) {
    return tokenFromAuth;
  }
  const accessToken = getCookie(cookieHeader, ACCESS_TOKEN_KEY);
  const refreshToken = getCookie(cookieHeader, REFRESH_TOKEN_KEY);
  if (accessToken && !isAccessTokenExpired(accessToken)) return accessToken;
  if (refreshToken) {
    try {
      const base = String(apiUrl).replace(/\/+$/, "");
      const res = await $fetch<{ accessToken: string }>(
        `${base}/auth/refresh-token`,
        { method: "POST", body: { refreshToken } }
      );
      return res?.accessToken ?? null;
    } catch (e) {
      console.warn(`${LOG} Token refresh failed`, (e as Error)?.message);
    }
  }
  return accessToken || (typeof tokenFromAuth === "string" ? tokenFromAuth : null) || null;
}
const ENGINE_PATH = "/socket.io"; // default path - client không cần truyền path
const ENGINE_PATH_SLASH = `${ENGINE_PATH}/`;

const LOG = "[socket-relay:app]";

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public?.enfyraSDK?.apiUrl;
  if (!apiUrl) {
    console.warn(`${LOG} Skip: apiUrl not set (enfyraSDK.apiUrl)`);
    return;
  }

  const backendUrl = String(apiUrl).replace(/\/+$/, "");
  console.log(`${LOG} Init backendUrl=${backendUrl} enginePath=${ENGINE_PATH}`);
  const engineOptions = {
    path: ENGINE_PATH,
    allowEIO3: false,
    // origin: true = reflect request origin (required when credentials: true, cannot use "*")
    cors: { origin: true, credentials: true },
  };
  const engine = new Engine(engineOptions as any);
  const io = new Server();
  io.bind(engine);

  // Allow dynamic namespaces (e.g. /chat, /notifications) - relay to backend
  io.of(/^\/.*$/).on("connection", async (clientSocket) => {
    const namespace = clientSocket.nsp.name;
    const backendNamespace =
      namespace === "/" || namespace === ""
        ? "/"
        : namespace.startsWith(WS_PREFIX)
          ? namespace.slice(WS_PREFIX.length) || "/"
          : namespace;
    const backendNsUrl = `${backendUrl}${backendNamespace}`;
    const query = clientSocket.handshake.query || {};
    const reconnect = query.reconnect !== "false"; // default true, ?reconnect=false để tắt
    console.log(`${LOG} Client connect namespace=${namespace} -> backend=${backendNsUrl} reconnect=${reconnect}`);

    const cookieHeader = clientSocket.handshake.headers?.cookie;
    const authFromClient = clientSocket.handshake.auth as Record<string, unknown> | undefined;
    const token = await resolveAccessToken(cookieHeader, authFromClient, apiUrl);
    const auth = { ...authFromClient } as Record<string, unknown>;
    if (token) auth.token = token;

    const backendSocket = ioClient(backendNsUrl, {
      path: "/socket.io",
      auth,
      transports: ["websocket", "polling"],
      reconnection: reconnect,
      reconnectionAttempts: reconnect ? Infinity : 0,
      reconnectionDelay: reconnect ? 1000 : 0,
      reconnectionDelayMax: reconnect ? 5000 : 0,
    });

    clientSocket.onAny((event: string, ...args: unknown[]) => {
      if (event !== "disconnect") backendSocket.emit(event, ...args);
    });
    backendSocket.onAny((event: string, ...args: unknown[]) => {
      clientSocket.emit(event, ...args);
    });
    clientSocket.on("disconnect", () => backendSocket.disconnect());

    if (reconnect) {
      backendSocket.on("disconnect", (reason) => {
        console.warn(`${LOG} Backend disconnected namespace=${namespace} reason=${reason}`);
        clientSocket.emit("backend_disconnected", { reason });
      });
      backendSocket.on("reconnect", () => {
        console.log(`${LOG} Backend reconnected namespace=${namespace}`);
        clientSocket.emit("backend_reconnected", {});
      });
      backendSocket.on("connect_error", (err: Error) => {
        console.error(`${LOG} Backend connect_error namespace=${namespace}`, err.message);
        clientSocket.emit("backend_connect_error", { message: err.message });
      });
    } else {
      backendSocket.on("disconnect", () => clientSocket.disconnect());
      backendSocket.on("connect_error", (err: Error) => {
        clientSocket.emit("connect_error", err.message);
        clientSocket.disconnect();
      });
    }
  });

  nitroApp.router.use(
    ENGINE_PATH_SLASH,
    defineEventHandler({
      handler(event) {
        try {
          engine.handleRequest(event.node.req as any, event.node.res as any);
        } catch (err: any) {
          console.error(`${LOG} engine.handleRequest error`, err?.message ?? err);
          throw err;
        }
        event._handled = true;
      },
      websocket: {
        open(peer: any) {
          const nodeReq = peer._internal?.nodeReq;
          if (nodeReq) {
            (engine as any).prepare(nodeReq);
            (engine as any).onWebSocket(nodeReq, nodeReq.socket, peer.websocket);
          }
        },
      },
    }),
  );
});
