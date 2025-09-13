import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";
import { createError } from "h3";

export async function buildExtensionWithVite(
  vueContent: string,
  extensionId: string
): Promise<string> {
  const buildId = `${extensionId}-${Date.now()}-${randomUUID()}`;
  const tempDir = join(process.cwd(), ".temp-extension-builds", buildId);
  const tempExtensionFile = join(tempDir, "extension.vue");
  const tempEntryFile = join(tempDir, "entry.js");

  try {
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    writeFileSync(tempExtensionFile, vueContent);
    writeFileSync(tempEntryFile, `
import ExtensionComponent from './extension.vue'
export default ExtensionComponent
`);

    await build({
      root: tempDir,
      build: {
        lib: {
          entry: tempEntryFile,
          name: extensionId,
          fileName: () => "extension.js",
          formats: ["umd"],
        },
        outDir: join(tempDir, "dist"),
        emptyOutDir: true,
        write: true,
        rollupOptions: {
          external: ["vue"],
          output: {
            globals: {
              vue: "Vue",
            },
          },
        },
      },
      plugins: [vue()],
    });

    const compiledFile = join(tempDir, "dist", "extension.js");
    const compiledCode = readFileSync(compiledFile, "utf-8");

    return compiledCode;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to build extension: ${
        error.message || "Unknown error"
      }`,
    });
  } finally {
    await cleanupTempDirectory(tempDir);
  }
}

async function cleanupTempDirectory(tempDir: string): Promise<void> {
  try {
    if (existsSync(tempDir)) {
      const fs = await import("fs/promises");
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (cleanupError) {
  }
}