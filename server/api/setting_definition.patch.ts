import { createError, defineEventHandler, readBody, setResponseHeaders } from "h3";
import { clearCorsCache } from "../middleware/cors";
import { useRuntimeConfig } from "#imports";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;
  
  if (!apiUrl) {
    throw createError({ 
      statusCode: 500, 
      message: "API URL not configured" 
    });
  }
  
  const body = await readBody(event);
  
  console.log('[PATCH /setting_definition] Intercepting request (no id)');
  console.log('[PATCH /setting_definition] Request body:', JSON.stringify(body, null, 2));
  
  const targetUrl = `${apiUrl.replace(/\/+$/, "")}/setting_definition`;
  
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
      console.log('[PATCH /setting_definition] ✅ Success, clearing CORS cache');
      clearCorsCache();
    } else {
      console.log('[PATCH /setting_definition] ⚠️ Failed (status:', response.status, '), keeping cache');
    }
    
    setResponseHeaders(event, {
      'Content-Type': 'application/json',
    });
    
    return responseData;
  } catch (error: any) {
    console.error('[PATCH /setting_definition] ❌ Error:', error.message);
    throw createError({
      statusCode: 502,
      message: error.message || 'Failed to proxy request to backend',
    });
  }
});
