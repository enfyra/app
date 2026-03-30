<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row gap-3">
      <UInput v-model="search" placeholder="Search routes..." icon="i-lucide-search" size="sm" class="flex-1" />
    </div>

    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState v-if="routeLoading" title="Loading routes..." size="md" type="card" context="page" />

      <div v-else class="space-y-6">
        <div v-if="customRoutes.length > 0">
          <p class="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Your Routes <UBadge size="xs" variant="soft" color="neutral" class="ml-1">{{ customRoutes.length }}</UBadge></p>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
            <div
              v-for="r in customRoutes"
              :key="r.id"
              class="glass-card-hover group p-3 rounded-lg cursor-pointer transition-all"
              @click="openTest(r)"
            >
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-primary-100 dark:bg-primary-900/40">
                  <UIcon :name="r.icon || 'lucide:code-2'" class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                </div>
                <p class="text-xs font-semibold font-mono text-gray-800 dark:text-gray-200 truncate flex-1">{{ r.path }}</p>
                <UBadge v-if="!r.isEnabled" color="warning" variant="soft" size="xs">Off</UBadge>
              </div>
              <div class="flex gap-1">
                <UBadge v-for="m in getRouteMethods(r)" :key="m" :color="methodColor(m)" variant="soft" size="xs">{{ m }}</UBadge>
              </div>
            </div>
          </div>
        </div>
        <CommonEmptyState v-else-if="!search" title="No custom routes" description="Create a table to generate API routes" icon="lucide:route" />

        <div>
          <button class="flex items-center gap-2 mb-3" @click="toggleSystemRoutes">
            <UIcon :name="systemExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="w-4 h-4 text-gray-400" />
            <span class="text-sm font-semibold text-gray-600 dark:text-gray-300">System Routes</span>
            <UBadge v-if="systemRoutes.length > 0" size="xs" variant="soft" color="neutral">{{ filteredSystemRoutes.length }}</UBadge>
            <span v-if="systemLoading" class="w-3 h-3 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
          </button>
          <div v-if="systemExpanded && filteredSystemRoutes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
            <div
              v-for="r in filteredSystemRoutes"
              :key="r.id"
              class="glass-card-hover group p-3 rounded-lg cursor-pointer transition-all"
              @click="openTest(r)"
            >
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                  <UIcon :name="r.icon || 'lucide:settings'" class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                <p class="text-xs font-semibold font-mono text-gray-800 dark:text-gray-200 truncate flex-1">{{ r.path }}</p>
              </div>
              <div class="flex gap-1">
                <UBadge v-for="m in getRouteMethods(r)" :key="m" :color="methodColor(m)" variant="soft" size="xs">{{ m }}</UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <RouteApiTestModal
      v-model="showTestModal"
      :route-path="selectedRoute?.path || ''"
      :available-methods="selectedRoute ? getRouteMethods(selectedRoute) : []"
      :published-methods="selectedRoutePublishedMethods"
      :handlers="selectedRoute?.handlers"
      :main-table-name="selectedRoute?.mainTable?.name"
      :schemas="schemas"
      :columns="selectedRouteColumns"
    />
  </div>
</template>

<script setup lang="ts">
import { HTTP_METHODS, getHttpMethodColor, type HttpMethod } from '~/utils/http.constants';

definePageMeta({ layout: "default", title: "API Tester" });

const { registerPageHeader } = usePageHeaderRegistry();
const { schemas, fetchSchema } = useSchema();

registerPageHeader({ title: "API Tester", gradient: "cyan" });

const search = ref('');
const selectedRoute = ref<any>(null);
const showTestModal = ref(false);

const routeFields = 'id,path,isEnabled,isSystem,icon,description,mainTable.id,mainTable.name,availableMethods.method,publishedMethods.method,handlers.method';

const { data: routesData, pending: routeLoading, execute: fetchRoutes } = useApi(
  '/route_definition',
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

const systemRoutes = ref<any[]>([]);
const systemLoading = ref(false);
const systemExpanded = ref(false);

const { data: systemData, execute: fetchSystemRoutes } = useApi(
  '/route_definition',
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
});

async function toggleSystemRoutes() {
  if (systemExpanded.value) {
    systemExpanded.value = false;
    return;
  }
  if (systemRoutes.value.length === 0) {
    systemLoading.value = true;
    await fetchSystemRoutes();
    systemRoutes.value = systemData.value?.data || [];
    systemLoading.value = false;
  }
  systemExpanded.value = true;
}

const customRoutes = computed(() => {
  const routes = routesData.value?.data || [];
  if (!search.value) return routes;
  const q = search.value.toLowerCase();
  return routes.filter((r: any) => r.path?.toLowerCase().includes(q) || r.mainTable?.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
});

const filteredSystemRoutes = computed(() => {
  if (!search.value) return systemRoutes.value;
  const q = search.value.toLowerCase();
  return systemRoutes.value.filter((r: any) => r.path?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
});

function getRouteMethods(route: any): string[] {
  const methods = route.availableMethods;
  if (!Array.isArray(methods)) return [];
  const mapped = methods.map((m: any) => m?.method).filter(Boolean);
  if (mapped.includes('REST')) return ['GET', 'POST', 'PATCH', 'DELETE'];
  return mapped.filter((m: string): m is HttpMethod => HTTP_METHODS.includes(m as HttpMethod));
}

function methodColor(m: string): any {
  return getHttpMethodColor(m);
}

function openTest(route: any) {
  selectedRoute.value = route;
  showTestModal.value = true;
}

const selectedRoutePublishedMethods = computed(() => {
  const methods = selectedRoute.value?.publishedMethods;
  if (!Array.isArray(methods)) return [];
  return methods.map((m: any) => m.method).filter(Boolean);
});

const selectedRouteColumns = computed(() => {
  const tableName = selectedRoute.value?.mainTable?.name;
  if (!tableName || !schemas.value?.[tableName]) return [];
  const table = schemas.value[tableName];
  const cols = table.columns || table.fields || [];
  return cols.map((c: any) => c.name || c.propertyName).filter(Boolean);
});
</script>
