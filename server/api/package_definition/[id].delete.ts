import {
  defineEventHandler,
  getHeader,
  getRouterParam,
  createError,
} from "h3";
import { $fetch } from "ofetch";
import { packageManagementService, getValidAuthHeaders } from "../../utils/package";

function getAuthHeaders(event: any) {
  return {
    cookie: getHeader(event, "cookie") || "",
    authorization: event.context.proxyHeaders?.authorization || "",
  };
}

export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || '';
  const pathMatch = path.match(/\/package_definition\/([^\/\?]+)/);
  const id = pathMatch?.[1] || event.context.params?._ || getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Package ID is required' });
  }

  try {
    const config = useRuntimeConfig();
    const apiUrl = (config.public as any).apiUrl;
    const cookieHeader = getHeader(event, "cookie") || "";
    const headers = getAuthHeaders(event);

    const getResponse = await $fetch(`${apiUrl}/package_definition`, {
      method: "GET",
      headers,
      query: { filter: JSON.stringify({ id: { _eq: id } }), limit: 1 },
    });

    const packageRecord = (getResponse as any)?.data?.[0];

    if (!packageRecord) {
      throw createError({ statusCode: 404, statusMessage: `Package with ID ${id} not found` });
    }

    if (packageRecord.isSystem) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot uninstall system packages' });
    }

    if (packageRecord.type === 'App') {
      await $fetch(`${apiUrl}/package_definition/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: { status: 'uninstalling', lastError: null },
      });

      const bgUninstall = async () => {
        try {
          await packageManagementService.uninstallPackage(packageRecord.name);
        } catch (e: any) {
          console.warn(`[App DELETE] uninstall from node_modules failed (continuing): ${e.message}`);
        }

        const authHeaders = await getValidAuthHeaders(cookieHeader, apiUrl);
        await $fetch(`${apiUrl}/package_definition/${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
      };

      bgUninstall().catch((e) => console.error('[App DELETE] background uninstall error:', e.message));

      return await $fetch(`${apiUrl}/package_definition`, {
        method: "GET",
        headers,
        query: { filter: JSON.stringify({ id: { _eq: id } }), limit: 1 },
      });
    }

    return await $fetch(`${apiUrl}/package_definition/${id}`, {
      method: "DELETE",
      headers,
    });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to delete package definition' });
  }
});
