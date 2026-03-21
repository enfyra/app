import { createError, defineEventHandler, getRequestHeader, readBody, setResponseHeaders } from "h3";
import { clearCorsCache } from "../../middleware/cors";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;
  
  if (!apiUrl) {
    throw createError({ statusCode: 500, message: "API URL not configured" });
  }
  
  const id = event.context.params?.id || "1";
  const body = await readBody(event);
  
  console.log('[PATCH setting_definition] id:', id, 'body:', JSON.stringify(body));
  
  const targetUrl = `${apiUrl.replace(/\/+$/, "")}/setting_definition/${id}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const authHeader = event.context.proxyHeaders?.authorization;
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  try {
    const response = await fetch(targetUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('[PATCH setting_definition] Success, clearing cache');
      clearCorsCache();
    } else {
      console.log('[PATCH setting_definition] Failed:', response.status);
    }
    
    setResponseHeaders(event, {
      'Content-Type': 'application/json',
    });
    
    return responseData;
  } catch (error: any) {
    console.error('[PATCH setting_definition] Error:', error.message);
    throw createError({
      statusCode: 502,
      message: error.message || 'Failed to proxy request to backend',
    });
  }
});
