<template>
  <CommonDrawer
    :handle="false"
    v-model="isOpen"
    direction="right"
    :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'w-full max-w-2xl'"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="lucide:route" class="w-5 h-5" />
        <div>
          <h3 class="text-lg font-semibold">Select Route</h3>
          <p class="text-sm text-muted-foreground mt-1">
            Choose a route for the permission
          </p>
        </div>
      </div>
    </template>

      <template #body>
        <div class="space-y-0">
          
          <div class="p-4 border-b border-muted">
            <div class="flex justify-between items-center">
              <div class="text-sm text-muted-foreground">
                {{
                  hasActiveFilters(currentFilter)
                    ? "Filtered routes"
                    : "All routes"
                }}
              </div>
              <UButton
                :variant="hasActiveFilters(currentFilter) ? 'solid' : 'outline'"
                :color="
                  hasActiveFilters(currentFilter) ? 'secondary' : 'neutral'
                "
                icon="lucide:filter"
                @click="showFilterDrawer = true"
              >
                {{
                  hasActiveFilters(currentFilter)
                    ? `Filter (${currentFilter.conditions.length})`
                    : "Filter"
                }}
              </UButton>
            </div>
          </div>

          <div class="p-4">
            
            <CommonLoadingState
              v-if="loading"
              type="form"
              context="inline"
              size="md"
            />

            <div v-else-if="routes.length > 0" class="space-y-2">
              <div
                v-for="route in routes"
                :key="route.id"
                class="flex items-center justify-between p-3 border border-muted rounded-lg lg:hover:bg-muted/20 cursor-pointer transition-colors"
                @click="selectRoute(route)"
              >
                <div class="flex items-center gap-3">
                  <UIcon name="lucide:route" class="w-5 h-5 text-primary" />
                  <div>
                    <p class="font-mono text-sm">{{ route.path }}</p>
                    <p
                      v-if="route.description"
                      class="text-xs text-muted-foreground mt-1"
                    >
                      {{ route.description }}
                    </p>
                  </div>
                </div>
                <UIcon
                  name="lucide:chevron-right"
                  class="w-4 h-4 text-muted-foreground"
                />
              </div>
            </div>

            <CommonEmptyState
              v-else
              :title="
                hasActiveFilters(currentFilter)
                  ? 'No routes found'
                  : 'No routes available'
              "
              :description="
                hasActiveFilters(currentFilter)
                  ? 'Try adjusting your filters'
                  : 'No routes are available'
              "
              icon="lucide:route"
              size="md"
              type="form"
              context="inline"
            >
              <UButton
                v-if="hasActiveFilters(currentFilter)"
                variant="soft"
                icon="lucide:x"
                @click="clearFilter"
                class="mt-3"
              >
                Clear Filters
              </UButton>
            </CommonEmptyState>
          </div>

          <div
            v-if="!loading && total > limit"
            class="px-4 pb-4 pt-0 border-t border-muted"
          >
            <div class="flex items-center justify-between pt-4">
              <div class="text-sm text-muted-foreground">
                Showing {{ (page - 1) * limit + 1 }}-{{
                  Math.min(page * limit, total)
                }}
                of {{ total }}
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  icon="lucide:chevron-left"
                  variant="outline"
                  size="sm"
                  :disabled="page <= 1"
                  @click="page--"
                />
                <span class="text-sm px-3 py-1 bg-muted rounded">{{
                  page
                }}</span>
                <UButton
                  icon="lucide:chevron-right"
                  variant="outline"
                  size="sm"
                  :disabled="page >= Math.ceil(total / limit)"
                  @click="page++"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
      </template>
    </CommonDrawer>

    <FilterDrawerLazy
      v-model="showFilterDrawer"
      table-name="route_definition"
      :current-filter="currentFilter"
      @apply="handleFilterApply"
    />
</template>

<script setup lang="ts">
const { isMobile, isTablet } = useScreen();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  select: [route: any];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const page = ref(1);
const limit = 7;

const { getIncludeFields } = useSchema("route_definition");

const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();
const currentFilter = ref(createEmptyFilter());
const showFilterDrawer = ref(false);

const {
  data: apiData,
  pending: loading,
  execute: fetchRoutes,
} = useApi(() => "/route_definition", {
  query: computed(() => {
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : {};

    return {
      fields: getIncludeFields(),
      page: page.value,
      limit,
      meta: "totalCount,filterCount",
      sort: "path",
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };
  }),
  errorContext: "Fetch Routes",
});

const routes = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

watch(page, () => {
  fetchRoutes();
});

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  page.value = 1; 
  await fetchRoutes();
}

async function clearFilter() {
  currentFilter.value = createEmptyFilter();
  page.value = 1; 
  await fetchRoutes();
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      fetchRoutes();
    }
  }
);

function selectRoute(route: any) {
  emit("select", route);
  close();
}

function close() {
  emit("update:modelValue", false);
  
  page.value = 1;
}
</script>
