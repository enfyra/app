import {
  defineEventHandler,
  readBody,
  getHeader,
  getRouterParam,
  createError,
} from "h3";
import { $fetch } from "ofetch";
import { packageManagementService } from "../../utils/package";

export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || '';
  const pathMatch = path.match(/\/package_definition\/([^\/\?]+)/);
  const id = pathMatch?.[1] || event.context.params?._ || getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Package ID is required',
    });
  }

  try {
    const body = await readBody(event);
    console.log('[PATCH proxy] START id=', id);
    const config = useRuntimeConfig();
    const apiUrl = (config.public as any).apiUrl;

    const getResponse = await $fetch(`${apiUrl}/package_definition`, {
      method: "GET",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization || "",
      },
      query: {
        filter: JSON.stringify({ id: { _eq: id } }),
        limit: 1,
      },
    });

    const packageRecord = (getResponse as any)?.data?.[0];

    console.log('[PATCH proxy] GET done, packageRecord=', packageRecord?.name, packageRecord?.type);

    if (!packageRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: `Package with ID ${id} not found`,
      });
    }

    if (packageRecord.type === 'App' && body.version && body.version !== packageRecord.version) {
      try {
        await packageManagementService.installPackage({
          name: packageRecord.name,
          version: body.version,
          flags: body.flags || '',
        });
      } catch (installError: any) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to update package: ${installError.message}`,
        });
      }
    }

    console.log('[PATCH proxy] calling PATCH to', `${apiUrl}/package_definition/${id}`);
    const patchResponse = await $fetch(`${apiUrl}/package_definition/${id}`, {
      method: "PATCH",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization || "",
        "Content-Type": "application/json",
      },
      body,
    });
    console.log('[PATCH proxy] PATCH done, response status=', (patchResponse as any)?.statusCode);
    return patchResponse;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || `Failed to update package definition`,
    });
  }
});
