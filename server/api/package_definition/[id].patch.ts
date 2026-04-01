import {
  defineEventHandler,
  readBody,
  getHeader,
  getRouterParam,
  createError,
} from "h3";
import { $fetch } from "ofetch";
import { packageManagementService, getValidAuthHeaders } from "../../utils/package";

export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || '';
  const pathMatch = path.match(/\/package_definition\/([^\/\?]+)/);
  const id = pathMatch?.[1] || event.context.params?._ || getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Package ID is required' });
  }

  try {
    const body = await readBody(event);
    const config = useRuntimeConfig();
    const apiUrl = (config.public as any).apiUrl;
    const cookieHeader = getHeader(event, "cookie") || "";
    const headers = {
      cookie: cookieHeader,
      authorization: event.context.proxyHeaders?.authorization || "",
    };

    const getResponse = await $fetch(`${apiUrl}/package_definition`, {
      method: "GET",
      headers,
      query: { filter: JSON.stringify({ id: { _eq: id } }), limit: 1 },
    });

    const packageRecord = (getResponse as any)?.data?.[0];

    if (!packageRecord) {
      throw createError({ statusCode: 404, statusMessage: `Package with ID ${id} not found` });
    }

    if (packageRecord.type === 'App' && body.version && body.version !== packageRecord.version) {
      await $fetch(`${apiUrl}/package_definition/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: { status: 'updating', lastError: null },
      });

      const bgInstall = async () => {
        try {
          const result = await packageManagementService.installPackage({
            name: packageRecord.name,
            version: body.version,
            flags: body.flags || '',
          });

          const authHeaders = await getValidAuthHeaders(cookieHeader, apiUrl);
          await $fetch(`${apiUrl}/package_definition/${id}`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: { ...body, status: 'installed', version: result.version, lastError: null },
          });
        } catch (error: any) {
          const authHeaders = await getValidAuthHeaders(cookieHeader, apiUrl);
          await $fetch(`${apiUrl}/package_definition/${id}`, {
            method: "PATCH",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: { status: 'failed', lastError: error.message },
          }).catch(() => {});
        }
      };

      bgInstall().catch((e) => console.error('[App PATCH] background install error:', e.message));

      return await $fetch(`${apiUrl}/package_definition`, {
        method: "GET",
        headers,
        query: { filter: JSON.stringify({ id: { _eq: id } }), limit: 1 },
      });
    }

    return await $fetch(`${apiUrl}/package_definition/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body,
    });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to update package definition' });
  }
});
