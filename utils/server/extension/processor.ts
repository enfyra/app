import { createError } from "h3";
import { autoAssignExtensionName } from "./naming";
import { isProbablyVueSFC, assertValidVueSFC, assertValidJsBundleSyntax } from "./validation";
import { buildExtensionWithVite } from "./compiler";

export function isExtensionDefinitionPath(path: string): boolean {
  return path.includes('/extension_definition');
}

export async function processExtensionDefinition(
  body: any,
  method: string
): Promise<{ processedBody: any; compiledCode?: string }> {
  if (method !== "POST" && method !== "PATCH") {
    return { processedBody: body };
  }

  if (!body || typeof body.code !== "string") {
    return { processedBody: body };
  }

  body = autoAssignExtensionName(body);

  const code: string = body.code;
  const extensionId = body.id || body.name || "extension_" + Date.now();

  if (isProbablyVueSFC(code)) {
    assertValidVueSFC(code);

    try {
      const compiledCode = await buildExtensionWithVite(code, body.extensionId);
      body.compiledCode = compiledCode;
      return { processedBody: body, compiledCode };
    } catch (compileError: any) {
      throw createError({
        statusCode: 400,
        statusMessage:
          compileError?.statusMessage ||
          `Failed to build Vue SFC for ${extensionId}: ${
            compileError?.message || "Unknown error"
          }`,
      });
    }
  } else {
    assertValidJsBundleSyntax(code);
    return { processedBody: body };
  }
}