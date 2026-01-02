import {
  defineEventHandler,
  readBody,
  getHeader,
  getRouterParam,
  createError,
} from "h3";
import { $fetch } from "ofetch";
import { packageManagementService } from "../../../utils/server/package";

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
    let body = await readBody(event);

    const config = useRuntimeConfig();
    const apiPath = event.path.replace("/api", "");
    const targetUrl = `${config.public?.enfyraSDK?.apiUrl}${apiPath}`;

    const getResponse = await $fetch(`${config.public?.enfyraSDK?.apiUrl}/package_definition/${id}`, {
      method: "GET",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization || "",
      },
    });

    const packageRecord = getResponse?.data?.[0];

    if (!packageRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: `Package with ID ${id} not found`,
      });
    }

    if (packageRecord.type === 'App') {
      if (body.version && body.version !== packageRecord.version) {
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

      const response = await $fetch(targetUrl, {
        method: "PATCH",
        headers: {
          cookie: getHeader(event, "cookie") || "",
          authorization: event.context.proxyHeaders?.authorization || "",
          "Content-Type": "application/json",
        },
        body: body || undefined,
      });

      return response;
    }

    const response = await $fetch(targetUrl, {
      method: "PATCH",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization || "",
        "Content-Type": "application/json",
      },
      body: body || undefined,
    });

    return response;
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
