import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  srcDir: 'app',
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  devServer: {
    port: parseInt(process.env.PORT || "3000"),
  },
    modules: [
    "@nuxt/icon",
    "@nuxt/ui",
    "nuxt-codemirror",
    "@enfyra/sdk-nuxt",
  ],
  serverHandlers: [
    {
      route: "/enfyra/api/npm-search",
      handler: "server/api/npm-search.get.ts",
      method: "get",
    },
    {
      route: "/enfyra/api/extension_definition",
      handler: "server/api/extension_definition.post.ts",
      method: "post",
    },
    {
      route: "/enfyra/api/extension_definition/**",
      handler: "server/api/extension_definition/[id].patch.ts",
      method: "patch",
    },
    {
      route: "**",
      handler: "server/middleware/server-id.ts",
      middleware: true,
    },
  ],
  colorMode: {
    preference: "dark",
    fallback: "dark",
    storageKey: "nuxt-color-mode",
  },
  ssr: false,
  css: ["assets/css/main.css"],
  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
        },
        { name: "theme-color", content: "#3b82f6" },
        { name: "color-scheme", content: "dark" },
      ],
      title: "Enfyra App - Content Management System",
      style: [
        {
          innerHTML: `
            html, body {
              overflow: hidden !important;
              position: fixed !important;
              width: 100% !important;
              height: 100% !important;
              touch-action: pan-x pan-y !important;
            }
          `,
        },
      ],
    },
  },
  imports: {
    dirs: ["composables/**/**", "utils/**/**/**"],
  },
  alias: {
    "~/app": "./app",
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['console-browserify'],
    },
    build: {
      rollupOptions: {
        external: ['util', 'assert'],
      },
    },
  },
  runtimeConfig: {
    public: {
      dbType: process.env.DB_TYPE || 'mysql',
    },
  },
  enfyraSDK: {
    apiUrl: process.env.API_URL
  },
});
