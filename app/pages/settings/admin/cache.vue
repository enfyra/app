<script setup lang="ts">
const toast = useToast();
const { registerPageHeader } = usePageHeaderRegistry();
const { checkPermissionCondition } = usePermissions();
const { me } = useEnfyraAuth();

const hasPermission = computed(() => {
  if (me.value?.isRootAdmin) return true;
  return checkPermissionCondition({
    or: [
      { route: "/route_definition", actions: ["update"] },
      { route: "/admin/reload", actions: ["create"] },
    ],
  });
});

registerPageHeader({
  title: "Cache Reload",
  description: "Manually reload server caches and schemas",
  variant: "default",
  gradient: "blue",
});

const reloadActions = [
  {
    id: "all",
    label: "Reload All",
    description: "Reload metadata, routes, Swagger, and GraphQL schema",
    icon: "lucide:refresh-cw",
    path: "/admin/reload",
    color: "primary",
  },
  {
    id: "metadata",
    label: "Metadata",
    description: "Reload metadata cache (tables, columns, relations)",
    icon: "lucide:database",
    path: "/admin/reload/metadata",
    color: "secondary",
  },
  {
    id: "routes",
    label: "Routes",
    description: "Reload routes cache",
    icon: "lucide:route",
    path: "/admin/reload/routes",
    color: "secondary",
  },
  {
    id: "swagger",
    label: "Swagger",
    description: "Reload Swagger API spec",
    icon: "lucide:file-code",
    path: "/admin/reload/swagger",
    color: "neutral",
  },
  {
    id: "graphql",
    label: "GraphQL",
    description: "Reload GraphQL schema",
    icon: "lucide:code",
    path: "/admin/reload/graphql",
    color: "neutral",
  },
];

const loadingMap = ref<Record<string, boolean>>({});

async function handleReload(action: typeof reloadActions[0]) {
  loadingMap.value[action.id] = true;
  try {
    const config = useRuntimeConfig().public.enfyraSDK;
    const { getAppUrl, normalizeUrl } = await import("~/utils/api/url");
    const apiUrl = getAppUrl();
    const apiPrefix = config?.apiPrefix || "/api";
    const basePath = action.path.replace(/^\/+/, "");
    const fullUrl = `${normalizeUrl(apiUrl, apiPrefix)}/${basePath}`;

    const response = await $fetch(fullUrl, {
      method: "POST",
      credentials: "include",
    });

    toast.add({
      title: "Reload successful",
      description: (response as any)?.message || `${action.label} reloaded`,
      color: "success",
    });
  } catch (err: any) {
    toast.add({
      title: "Reload failed",
      description: err?.data?.message || err?.message || "An error occurred",
      color: "error",
    });
  } finally {
    loadingMap.value[action.id] = false;
  }
}
</script>

<template>
  <div v-if="hasPermission" class="space-y-6">
    <div class="max-w-2xl">
      <CommonFormCard>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Reload server-side caches after making changes to routes, tables, or schema. Use when changes are not reflected immediately.
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="action in reloadActions"
              :key="action.id"
              class="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 p-4 transition-colors hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div
                :class="[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  action.color === 'primary' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400' : 'bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
                ]"
              >
                <UIcon :name="action.icon" class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-medium text-gray-900 dark:text-white">
                  {{ action.label }}
                </h3>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ action.description }}
                </p>
                <UButton
                  :loading="loadingMap[action.id]"
                  :disabled="loadingMap[action.id]"
                  size="sm"
                  :color="action.color as any"
                  variant="soft"
                  class="mt-2"
                  :icon="loadingMap[action.id] ? undefined : 'lucide:play'"
                  @click="handleReload(action)"
                >
                  {{ loadingMap[action.id] ? "Reloading..." : "Reload" }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </CommonFormCard>
    </div>
  </div>

  <div v-else class="flex items-center justify-center py-12">
    <CommonEmptyState
      title="Access denied"
      description="You do not have permission to reload cache. Contact an administrator."
      icon="lucide:lock"
      size="md"
    />
  </div>
</template>
