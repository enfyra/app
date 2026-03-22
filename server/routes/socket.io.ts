import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { getCorsOrigins } from '../middleware/cors';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const backendUrl = config.public.apiUrl;

  if (!backendUrl) {
    console.error('[socket.io proxy] API_URL not configured');
    return;
  }

  const reqUrl = event.node.req.url || '';
  const origin = event.node.req.headers.origin;

  // Set CORS headers
  const allowedOrigins = getCorsOrigins();
  if (allowedOrigins.length === 0) {
    // No origins configured, allow all
    event.node.res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    event.node.res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    event.node.res.setHeader('Access-Control-Allow-Origin', '*');
  }
  event.node.res.setHeader('Access-Control-Allow-Credentials', 'true');
  event.node.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  event.node.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Socket.IO path - no rewrite needed, namespace is in query/connection
  const targetPath = reqUrl;

  const targetUrl = new URL(backendUrl);
  const isHttps = targetUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetPath,
      method: event.node.req.method || 'GET',
      headers: {
        ...event.node.req.headers,
        host: targetUrl.host,
        origin: backendUrl,
      },
    };

    const proxyReq = httpModule.request(options, (proxyRes) => {
      // Set response headers from backend first
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          event.node.res.setHeader(key, value);
        }
      });

      // Override CORS headers after backend headers
      event.node.res.setHeader('Access-Control-Allow-Origin', origin || '*');
      event.node.res.setHeader('Access-Control-Allow-Credentials', 'true');
      event.node.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      event.node.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

      event.node.res.statusCode = proxyRes.statusCode || 200;

      // Pipe response
      proxyRes.on('data', (chunk) => {
        event.node.res.write(chunk);
      });

      proxyRes.on('end', () => {
        event.node.res.end();
        resolve(undefined);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[socket.io proxy] Error:', err.message);
      event.node.res.statusCode = 500;
      event.node.res.end(JSON.stringify({ error: err.message }));
      resolve(undefined);
    });

    // Pipe request body
    event.node.req.pipe(proxyReq);
  });
});
