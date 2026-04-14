<script setup lang="ts">
const notify = useNotify();
const { registerPageHeader } = usePageHeaderRegistry();
const { checkPermissionCondition } = usePermissions();
const { me } = useAuth();

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
    description: "Reload metadata, routes, and GraphQL schema",
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
    const { getAppUrl, normalizeUrl } = await import("~/utils/api/url");
    const apiUrl = getAppUrl();
    const apiPrefix = "/api";
    const basePath = action.path.replace(/^\/+/, "");
    const fullUrl = `${normalizeUrl(apiUrl, apiPrefix)}/${basePath}`;

    const response = await $fetch(fullUrl, {
      method: "POST",
      credentials: "include",
    });

    notify.success("Reload successful", (response as any)?.message || `${action.label} reloaded`);
  } catch (err: any) {
    notify.error("Reload failed", err?.data?.message || err?.message || "An error occurred");
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
          <p class="text-sm text-[var(--text-tertiary)]">
            Reload server-side caches after making changes to routes, tables, or schema. Use when changes are not reflected immediately.
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="action in reloadActions"
              :key="action.id"
              class="flex items-start gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 transition-colors hover:border-[var(--border-strong)]"
            >
              <div
                :class="[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  action.color === 'primary' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400' : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)]',
                ]"
              >
                <UIcon :name="action.icon" class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-medium text-[var(--text-primary)]">
                  {{ action.label }}
                </h3>
                <p class="mt-0.5 text-xs text-[var(--text-tertiary)]">
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
