import {
  defineEventHandler,
  readBody,
  getHeader,
  createError,
} from "h3";
import { $fetch } from "ofetch";
import { packageManagementService, getValidAuthHeaders } from "../utils/package";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const config = useRuntimeConfig();
    const apiUrl = (config.public as any).apiUrl;
    const cookieHeader = getHeader(event, "cookie") || "";
    const headers = {
      cookie: cookieHeader,
      authorization: event.context.proxyHeaders?.authorization || "",
    };

    if (body.type !== 'App') {
      return await $fetch(`${apiUrl}/package_definition`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body,
      });
    }

    const savedPackage = await $fetch(`${apiUrl}/package_definition`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: { ...body, status: 'installing' },
    }) as any;

    const packageId = savedPackage?.data?.[0]?.id || savedPackage?.data?.[0]?._id;

    const bgInstall = async () => {
      try {
        const result = await packageManagementService.installPackage({
          name: body.name,
          version: body.version || 'latest',
          flags: body.flags || '',
        });

        const authHeaders = await getValidAuthHeaders(cookieHeader, apiUrl);
        await $fetch(`${apiUrl}/package_definition/${packageId}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: { status: 'installed', version: result.version, lastError: null },
        });
      } catch (error: any) {
        const authHeaders = await getValidAuthHeaders(cookieHeader, apiUrl);
        await $fetch(`${apiUrl}/package_definition/${packageId}`, {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: { status: 'failed', lastError: error.message },
        }).catch(() => {});
      }
    };

    bgInstall().catch((e) => console.error('[App POST] background install error:', e.message));

    return savedPackage;
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to process package definition' });
  }
});
