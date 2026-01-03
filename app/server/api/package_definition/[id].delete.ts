import {
  defineEventHandler,
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
    const config = useRuntimeConfig();
    const getResponse = await $fetch(`${config.public?.enfyraSDK?.apiUrl}/package_definition`, {
      method: "GET",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization || "",
      },
      query: {
        filter: {
          id: { _eq: id },
        },
      },
    });

    const packageRecord = getResponse?.data?.[0];

    if (!packageRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: `Package with ID ${id} not found`,
      });
    }

    if (packageRecord.isSystem) {
      throw createError({
        statusCode: 400,
        statusMessage: "Cannot uninstall system packages",
      });
    }

    if (packageRecord.type === 'App') {
      try {
        await packageManagementService.uninstallPackage(packageRecord.name);
      } catch (uninstallError: any) {
        console.error(`Failed to uninstall package ${packageRecord.name}:`, uninstallError);
      }

      const response = await $fetch(`${config.public?.enfyraSDK?.apiUrl}/package_definition/${id}`, {
        method: "DELETE",
        headers: {
          cookie: getHeader(event, "cookie") || "",
          authorization: event.context.proxyHeaders?.authorization || "",
        },
      });

      return response;
    }

    const response = await $fetch(`${config.public?.enfyraSDK?.apiUrl}/package_definition/${id}`, {
      method: "DELETE",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization || "",
      },
    });

    return response;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || `Failed to delete package definition`,
    });
  }
});
