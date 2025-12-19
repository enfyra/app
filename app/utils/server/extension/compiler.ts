import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";
import { createError } from "h3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    const projectRoot = process.cwd();
    const parentDir = resolve(projectRoot, "..");
    
    const possibleVuePaths = [
      resolve(parentDir, "node_modules/vue"),
      resolve(projectRoot, "node_modules/vue"),
      resolve(projectRoot, ".output/server/node_modules/vue"),
    ];
    
    const possibleCompilerPaths = [
      resolve(parentDir, "node_modules/@vue/compiler-sfc"),
      resolve(projectRoot, "node_modules/@vue/compiler-sfc"),
      resolve(projectRoot, ".output/server/node_modules/@vue/compiler-sfc"),
    ];
    
    let vuePath: string | undefined;
    let vueCompilerPath: string | undefined;
    
    try {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      vuePath = require.resolve("vue");
      try {
        vueCompilerPath = require.resolve("vue/compiler-sfc");
      } catch {
        vueCompilerPath = require.resolve("@vue/compiler-sfc");
      }
    } catch (e) {
      vuePath = possibleVuePaths.find(p => existsSync(p));
      vueCompilerPath = possibleCompilerPaths.find(p => existsSync(p));
    }
    
    if (!vuePath || !existsSync(vuePath)) {
      console.error(`Vue not found. Tried:`, possibleVuePaths);
      throw new Error(`Vue not found. Make sure vue is installed. Searched: ${possibleVuePaths.join(", ")}`);
    }
    if (!vueCompilerPath || !existsSync(vueCompilerPath)) {
      console.error(`Vue compiler-sfc not found. Tried:`, possibleCompilerPaths);
      throw new Error(`Vue compiler-sfc not found. Make sure vue is installed. Searched: ${possibleCompilerPaths.join(", ")}`);
    }

    await build({
      root: projectRoot,
      resolve: {
        alias: {
          vue: vuePath,
          "vue/compiler-sfc": vueCompilerPath,
          "@vue/compiler-sfc": vueCompilerPath,
        },
        dedupe: ["vue", "@vue/compiler-sfc"],
      },
      server: {
        fs: {
          allow: [projectRoot, parentDir, resolve(projectRoot, "node_modules"), resolve(parentDir, "node_modules"), resolve(projectRoot, ".output")],
        },
      },
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