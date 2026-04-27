export default defineNuxtConfig({
  srcDir: 'app',
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  sourcemap: {
    client: false,
    server: false,
  },
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
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap",
        },
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
    optimizeDeps: {
      exclude: ['console-browserify'],
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'socket.io-client',
        'json5',
        '@internationalized/date',
        '@codemirror/commands',
        '@codemirror/autocomplete',
        '@codemirror/language',
        '@lezer/highlight',
        '@codemirror/lint',
        '@codemirror/search',
        '@codemirror/lang-javascript',
        '@codemirror/lang-vue',
        '@codemirror/lang-html',
        '@uiw/codemirror-theme-vscode',
        '@codemirror/view',
        '@codemirror/state',
        'typescript',
        '@tanstack/vue-table',
      ],
    },
    build: {
      chunkSizeWarningLimit: 4000,
      sourcemap: false,
      rollupOptions: {
        external: ['util', 'assert'],
        onwarn(warning, warn) {
          if (warning.message.includes('Sourcemap is likely to be incorrect')) {
            return;
          }

          warn(warning);
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL?.replace(/\/+$/, ''),
      demoLoginPrefill: process.env.NUXT_PUBLIC_DEMO_LOGIN_PREFILL === 'true',
    },
  },
  routeRules: {
    '/api/packages/**': {
      swr: 86400,
    },
    '/socket.io/**': {
      ssr: false,
      cache: false,
    },
  },
});
