<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row gap-3">
      <UInput v-model="search" placeholder="Search routes..." icon="i-lucide-search" size="sm" class="flex-1" />
    </div>

    <Transition name="loading-fade" mode="out-in">
      <CommonResourceListFrame
        v-if="showInitialLoading"
        :loading="true"
        :has-items="false"
        loading-title="Loading routes..."
        loading-description="Fetching route definitions"
      >
        <template #skeleton-row>
          <CommonResourceListSkeletonRow
            title-width="w-56"
            description-width="w-36"
            :chips="['w-12', 'w-12', 'w-16']"
            :show-trailing="false"
          />
        </template>
      </CommonResourceListFrame>

      <div v-else class="space-y-4">
        <UTabs
          v-model="activeScope"
          :items="routeTabItems"
          :content="false"
          variant="link"
        />

        <section v-if="activeScope === 'custom'" class="space-y-3">
          <div v-if="customRoutes.length > 0" class="eapp-resource-list">
            <CommonResourceListItem
              v-for="r in customRoutes"
              :key="r.id"
              :title="r.path"
              :description="r.mainTable?.name || r.description || 'Route'"
              :icon="r.icon || 'lucide:code-2'"
              icon-color="primary"
              :content-loading="customRoutesRefreshing"
              :top-badge="!r.isEnabled ? { label: 'Off', color: 'warning' } : undefined"
              @click="openTest(r)"
            >
              <template #skeleton-content>
                <span class="block h-4 w-56 rounded skeleton-gradient skeleton-pulse-slow" />
                <span class="block h-3 w-36 rounded skeleton-inline skeleton-pulse-slow" />
                <span class="flex flex-wrap gap-2">
                  <span class="block h-5 w-12 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
                  <span class="block h-5 w-12 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
                  <span class="hidden h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
                </span>
              </template>

              <template #metadata>
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  <MethodBadge v-for="m in getRouteMethods(r)" :key="m.name" :method="m" />
                  <UBadge v-if="r.publicMethods?.length" color="info" variant="soft" size="xs">
                    {{ r.publicMethods.length }} public
                  </UBadge>
                </div>
              </template>
            </CommonResourceListItem>
          </div>
          <CommonEmptyState
            v-else
            :title="search ? 'No matching custom routes' : 'No custom routes'"
            :description="search ? 'No custom routes match your search' : 'Create a table to generate API routes'"
            icon="lucide:route"
          />
        </section>

        <section v-else class="space-y-3">
          <CommonResourceListFrame
            v-if="systemLoading"
            :loading="true"
            :has-items="false"
            loading-title="Loading system routes..."
            loading-description="Fetching system route definitions"
          >
            <template #skeleton-row>
              <CommonResourceListSkeletonRow
                title-width="w-56"
                description-width="w-44"
                :chips="['w-12', 'w-12', 'w-16']"
                :show-trailing="false"
              />
            </template>
          </CommonResourceListFrame>

          <div v-else-if="filteredSystemRoutes.length > 0" class="eapp-resource-list">
            <CommonResourceListItem
              v-for="r in filteredSystemRoutes"
              :key="r.id"
              :title="r.path"
              :description="r.description || 'System route'"
              :icon="r.icon || 'lucide:settings'"
              icon-color="neutral"
              :top-badge="{ label: 'System', color: 'neutral' }"
              @click="openTest(r)"
            >
              <template #metadata>
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  <MethodBadge v-for="m in getRouteMethods(r)" :key="m.name" :method="m" />
                  <UBadge v-if="r.publicMethods?.length" color="info" variant="soft" size="xs">
                    {{ r.publicMethods.length }} public
                  </UBadge>
                </div>
              </template>
            </CommonResourceListItem>
          </div>
          <CommonEmptyState
            v-else
            :title="search ? 'No matching system routes' : 'No system routes'"
            :description="search ? 'No system routes match your search' : 'System routes will appear here after loading'"
            icon="lucide:settings"
          />
        </section>
      </div>
    </Transition>

    <RouteApiTestModal
      v-model="showTestModal"
      :route-path="selectedRoute?.path || ''"
      :available-methods="selectedRoute ? getRouteMethods(selectedRoute) : []"
      :public-methods="selectedRoutePublicMethods"
      :handlers="selectedRoute?.handlers"
      :main-table-name="selectedRoute?.mainTable?.name"
      :schemas="schemas"
      :columns="selectedRouteColumns"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default", title: "API Tester" });

const { registerPageHeader } = usePageHeaderRegistry();
const { schemas, fetchSchema } = useSchema();

registerPageHeader({ title: "API Tester", gradient: "cyan" });

const search = ref('');
const selectedRoute = ref<any>(null);
const showTestModal = ref(false);
const route = useRoute();
const router = useRouter();

const routeFields = 'id,path,isEnabled,isSystem,icon,description,mainTable.id,mainTable.name,availableMethods.name,availableMethods.buttonColor,availableMethods.textColor,publicMethods.name,publicMethods.buttonColor,publicMethods.textColor,handlers.method.name';
type RouteScope = 'custom' | 'system';

function normalizeScope(value: unknown): RouteScope {
  return value === 'system' ? 'system' : 'custom';
}

const activeScope = ref<RouteScope>(normalizeScope(route.query.scope));

const { data: routesData, pending: routeLoading, execute: fetchRoutes } = useApi(
  '/enfyra_route',
  {
    query: {
      fields: routeFields,
      filter: { isSystem: { _eq: false } },
      limit: 0,
      sort: 'path',
    },
    errorContext: 'Fetch Routes',
  }
);

const {
  items: customRouteItems,
  showInitialLoading,
  isRefreshing: customRoutesRefreshing,
} = useStableListState(() => routesData.value?.data, () => routeLoading.value);

const systemRoutes = ref<any[]>([]);
const systemLoading = ref(false);

const { data: systemData, execute: fetchSystemRoutes } = useApi(
  '/enfyra_route',
  {
    query: {
      fields: routeFields,
      filter: { isSystem: { _eq: true } },
      limit: 0,
      sort: 'path',
    },
    errorContext: 'Fetch System Routes',
  }
);

onMounted(async () => {
  await fetchRoutes();
  await fetchSchema();
  if (activeScope.value === 'system') {
    await loadSystemRoutes();
  }
});

async function loadSystemRoutes() {
  if (systemRoutes.value.length === 0) {
    systemLoading.value = true;
    await fetchSystemRoutes();
    systemRoutes.value = systemData.value?.data || [];
    systemLoading.value = false;
  }
}

watch(
  () => route.query.scope,
  async (scope) => {
    const next = normalizeScope(scope);
    if (activeScope.value !== next) {
      activeScope.value = next;
    }
    if (next === 'system') {
      await loadSystemRoutes();
    }
  },
);

watch(activeScope, async (scope) => {
  if (normalizeScope(route.query.scope) !== scope) {
    const query = { ...route.query };
    if (scope === 'custom') delete query.scope;
    else query.scope = scope;
    await router.replace({ query });
  }
  if (scope === 'system') {
    await loadSystemRoutes();
  }
});

const customRoutes = computed(() => {
  const routes = customRouteItems.value;
  if (!search.value) return routes;
  const q = search.value.toLowerCase();
  return routes.filter((r: any) => r.path?.toLowerCase().includes(q) || r.mainTable?.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
});

const filteredSystemRoutes = computed(() => {
  if (!search.value) return systemRoutes.value;
  const q = search.value.toLowerCase();
  return systemRoutes.value.filter((r: any) => r.path?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
});

const routeTabItems = computed(() => [
  {
    label: 'Your Routes',
    value: 'custom',
    icon: 'lucide:route',
  },
  {
    label: 'System Routes',
    value: 'system',
    icon: 'lucide:settings',
  },
]);

function getRouteMethods(route: any): any[] {
  const methods = route.availableMethods;
  if (!Array.isArray(methods)) return [];
  return methods.filter((m: any) => m?.name);
}

function openTest(route: any) {
  selectedRoute.value = route;
  showTestModal.value = true;
}

const selectedRoutePublicMethods = computed(() => {
  const methods = selectedRoute.value?.publicMethods;
  if (!Array.isArray(methods)) return [];
  return methods.map((m: any) => m.name).filter(Boolean);
});

const selectedRouteColumns = computed(() => {
  const tableName = selectedRoute.value?.mainTable?.name;
  if (!tableName || !schemas.value?.[tableName]) return [];
  const table = schemas.value[tableName];
  const cols = table.columns || table.fields || [];
  return cols.map((c: any) => c.name || c.propertyName).filter(Boolean);
});
</script>
