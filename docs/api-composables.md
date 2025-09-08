# API Guide - Using Enfyra SDK

**🚀 This application uses the official @enfyra/sdk-nuxt package for all API operations.**

## Official Enfyra SDK

All data fetching and API operations in this application are powered by the **@enfyra/sdk-nuxt** package. This provides:

### Main Composables

- **`useEnfyraApi<T>()`**: For all API requests (supports both SSR and client-side)
- **`useEnfyraAuth()`**: For authentication state and operations

### Key Features

- ✅ Full SSR and client-side support
- ✅ TypeScript integration with context-aware autocompletion  
- ✅ Automatic error handling and reactive state management
- ✅ Batch operations with real-time progress tracking
- ✅ Automatic asset proxying
- ✅ Built-in authentication composables

## Quick Examples

```typescript
// API requests
const { data, pending, error } = useEnfyraApi('/users', {
  ssr: true,
  key: 'users-list'
});

// Authentication
const { me, login, logout, isLoggedIn } = useEnfyraAuth();
```

> **🔗 Complete SDK Documentation**: All parameters, options, and advanced usage examples are available in the official SDK documentation.

## 📚 Complete Documentation

**For detailed documentation, all composable options, examples, and best practices:**

👉 **Official SDK Documentation: https://github.com/dothinh115/enfyra-sdk-nuxt**

**Key SDK Documentation Sections:**
- [API Usage](https://github.com/dothinh115/enfyra-sdk-nuxt#api-usage) - useEnfyraApi examples and options
- [Authentication](https://github.com/dothinh115/enfyra-sdk-nuxt#authentication) - useEnfyraAuth guide
- [TypeScript Support](https://github.com/dothinh115/enfyra-sdk-nuxt#typescript) - Type definitions and auto-completion
- [Error Handling](https://github.com/dothinh115/enfyra-sdk-nuxt#error-handling) - Built-in error management
- [Caching & Performance](https://github.com/dothinh115/enfyra-sdk-nuxt#caching) - Optimization strategies

## Configuration

The SDK is configured in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ["@enfyra/sdk-nuxt"],
  enfyraSDK: {
    apiUrl: process.env.API_URL
  }
});
```

## Why Use the Official SDK?

- **Maintained by Enfyra Team**: Always up-to-date with latest features
- **Optimized Performance**: Built specifically for Enfyra applications
- **Type Safety**: Full TypeScript support with auto-completion
- **Consistent API**: Standardized across all Enfyra projects
- **Built-in Features**: Error handling, caching, batch operations out of the box