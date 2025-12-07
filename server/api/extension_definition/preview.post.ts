import { buildExtensionWithVite } from "../../../utils/server/extension/compiler";
import { isProbablyVueSFC, assertValidVueSFC, assertValidJsBundleSyntax } from "../../../utils/server/extension/validation";
import { createError } from "h3";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body || typeof body.code !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Code is required",
    });
  }

  const code: string = body.code;
  const extensionId = body.id || body.name || "preview_" + Date.now();

  if (isProbablyVueSFC(code)) {
    assertValidVueSFC(code);

    try {
      const compiledCode = await buildExtensionWithVite(code, extensionId);
      return {
        success: true,
        compiledCode,
        extensionId,
      };
    } catch (compileError: any) {
      throw createError({
        statusCode: 400,
        statusMessage:
          compileError?.statusMessage ||
          `Failed to build Vue SFC: ${
            compileError?.message || "Unknown error"
          }`,
      });
    }
  } else {
    assertValidJsBundleSyntax(code);
    return {
      success: true,
      compiledCode: code,
    };
  }
});

