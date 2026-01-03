import {
  defineEventHandler,
  readBody,
  getHeader,
  createError,
} from "h3";
import { $fetch } from "ofetch";
import { packageManagementService } from "../../utils/server/package";

export default defineEventHandler(async (event) => {
  const method = event.method;

  try {
    let body = await readBody(event);

    if (!body.type || body.type !== 'App') {
      const config = useRuntimeConfig();
      const apiPath = event.path.replace("/api", "");
      const targetUrl = `${config.public?.enfyraSDK?.apiUrl}${apiPath}`;

      const response = await $fetch(targetUrl, {
        method: method as any,
        headers: {
          cookie: getHeader(event, "cookie") || "",
          authorization: event.context.proxyHeaders?.authorization || "",
          "Content-Type": "application/json",
        },
        body: body || undefined,
      });

      return response;
    }

    if (body.type === 'App') {
      const config = useRuntimeConfig();
      const apiPath = event.path.replace("/api", "");
      const targetUrl = `${config.public?.enfyraSDK?.apiUrl}${apiPath}`;

      let savedPackage: any;

      try {
        savedPackage = await $fetch(targetUrl, {
          method: method as any,
          headers: {
            cookie: getHeader(event, "cookie") || "",
            authorization: event.context.proxyHeaders?.authorization || "",
            "Content-Type": "application/json",
          },
          body: body || undefined,
        });
      } catch (dbError: any) {
        throw createError({
          statusCode: dbError.statusCode || 500,
          statusMessage: dbError.message || "Failed to save package to database",
        });
      }

      try {
        const installResult = await packageManagementService.installPackage({
          name: body.name,
          version: body.version || 'latest',
          flags: body.flags || '',
        });

        return savedPackage;
      } catch (installError: any) {
        const packageId = savedPackage?.data?.[0]?.id || savedPackage?.data?.[0]?._id;

        if (packageId) {
          try {
            await $fetch(`${config.public?.enfyraSDK?.apiUrl}/package_definition/${packageId}`, {
              method: "DELETE",
              headers: {
                cookie: getHeader(event, "cookie") || "",
                authorization: event.context.proxyHeaders?.authorization || "",
              },
            });
          } catch (deleteError) {
            console.error("Failed to rollback package after install error:", deleteError);
          }
        }

        throw createError({
          statusCode: 500,
          statusMessage: `Package installation failed, rolled back: ${installError.message}`,
        });
      }
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || `Failed to process package definition ${method}`,
    });
  }
});
