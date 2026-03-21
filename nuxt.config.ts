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
    "@nuxtjs/color-mode",
    "nuxt-codemirror",
    "@tailwindcss/vite",
  ],
  
  colorMode: {
    preference: "light",
    fallback: "light",
    storageKey: "nuxt-color-mode",
    classPrefix: "",
    classSuffix: "",
    disableTransition: true,
    dataValue: "",
    globalName: "colorMode",
    componentName: "ColorScheme",
    storage: "localStorage",
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
        { name: "color-scheme", content: "light" },
      ],
      title: "Enfyra App - Content Management System",
      style: [
        {
          innerHTML: `
            html {
              height: 100%;
            }
            html, body, #__nuxt {
              width: 100% !important;
              min-height: 100% !important;
              overflow-x: hidden !important;
              overscroll-behavior-x: auto !important;
              touch-action: pan-x pan-y !important;
            }
          `,
        },
      ],
    },
  },
  imports: {
    dirs: ["composables/**/**", "utils/**/**/**", "types/**", "types/**/**"],
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
      apiUrl: process.env.API_URL,
    },
  },
  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
    '/api/packages/**': {
      swr: 86400,
    },
  },
});
