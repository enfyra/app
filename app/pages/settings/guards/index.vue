<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import {
  buildGuardBodyFromTemplate,
  buildGuardRuleBodyFromTemplate,
  getGuardTemplate,
  getGuardTemplatesForScope,
} from '~/utils/guard-templates';
import type { GuardScope } from '~/types/guard-template';

const notify = useNotify();
const page = ref(1);
const pageLimit = 12;
const route = useRoute();
const router = useRouter();
const tableName = 'enfyra_guard';
const { confirm } = useConfirm();
const { createEmptyFilter, buildQuery, hasActiveFilters, countActiveFilters } = useFilterQuery();
const { registerPageHeader } = usePageHeaderRegistry();
const { getId, getIdFieldName } = useDatabase();
const idField = getIdFieldName();
const GUARD_LIST_FIELDS = [
  'id',
  'name',
  'description',
  'isEnabled',
  'isGlobal',
  'type',
  'gqlOperation',
  'position',
  'combinator',
  'route.id',
  'route.path',
  'table.id',
  'table.name',
  'table.alias',
].join(',');
const GUARD_ROUTE_OPTION_FIELDS = [
  'id',
  'path',
].join(',');

registerPageHeader({
  title: 'Guard Manager',
  gradient: 'purple',
});

const showFilterDrawer = ref(false);
const activeType = ref<'route' | 'graphql'>('route');
const switchingType = ref(false);
const suppressListTransition = ref(false);
const filtersByType = reactive<Record<'route' | 'graphql', FilterGroup>>({
  route: createEmptyFilter(),
  graphql: createEmptyFilter(),
});
const currentFilter = computed<FilterGroup>({
  get: () => filtersByType[activeType.value],
  set: (value) => {
    filtersByType[activeType.value] = value;
  },
});
const activeFilterFields = computed(() => getGuardFilterFields(activeType.value));
const activeFilterCount = computed(() => countActiveFilters(currentFilter.value));

const guardTabItems = computed(() => [
  {
    label: 'Route Guards',
    value: 'route',
    icon: 'lucide:route',
  },
  {
    label: 'GraphQL Guards',
    value: 'graphql',
    icon: 'lucide:braces',
  },
]);

const filterLabel = computed(() => {
  const activeCount = activeFilterCount.value;
  return activeCount > 0 ? `Filters (${activeCount})` : 'Filter';
});

const filterVariant = computed(() => {
  return hasActiveFilters(currentFilter.value) ? 'solid' : 'outline';
});

const filterColor = computed(() => {
  return hasActiveFilters(currentFilter.value) ? 'secondary' : 'neutral';
});

const {
  data: apiData,
  pending: loading,
  execute: fetchGuards,
} = useApi(() => '/enfyra_guard', {
  query: computed(() => {
    const conditions: any[] = [
      { parent: { _is_null: true } },
      { type: { _eq: activeType.value } },
    ];

    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : null;
    if (filterQuery) {
      conditions.push(filterQuery);
    }

    return {
      fields: GUARD_LIST_FIELDS,
      sort: 'priority',
      meta: '*',
      page: page.value,
      limit: pageLimit,
      filter: { _and: conditions },
    };
  }),
  errorContext: 'Fetch Guards',
});

const {
  items: guardsData,
  showInitialLoading,
  isRefreshing: guardsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const globalGuardCount = computed(() => guardsData.value.filter((guard: any) => guard.isGlobal).length);
const routeGuardCount = computed(() => guardsData.value.filter((guard: any) => !guard.isGlobal).length);
const enabledGuardCount = computed(() => guardsData.value.filter((guard: any) => guard.isEnabled).length);
const allTablesGuardCount = computed(() => guardsData.value.filter((guard: any) => !guard.table).length);
const operationGuardCount = computed(() => guardsData.value.filter((guard: any) => guard.gqlOperation).length);
const total = computed(() => apiData.value?.meta?.filterCount ?? 0);
const isListLoading = computed(() => loading.value || switchingType.value || guardsRefreshing.value);
const isPageLoading = computed(() => showInitialLoading.value || isListLoading.value);
const listStateKey = computed(() => {
  if (isPageLoading.value) return `${activeType.value}:loading`;
  return `${activeType.value}:${guardsData.value.length > 0 ? 'items' : 'empty'}`;
});
const summaryCards = computed(() => {
  if (activeType.value === 'graphql') {
    return [
      {
        label: 'Active',
        value: enabledGuardCount.value,
        description: 'Enabled GraphQL guards in this view',
      },
      {
        label: 'All tables',
        value: allTablesGuardCount.value,
        description: 'Apply across every GraphQL table',
      },
      {
        label: 'Specific operation',
        value: operationGuardCount.value,
        description: 'Target one GraphQL operation',
      },
    ];
  }

  return [
    {
      label: 'Active',
      value: enabledGuardCount.value,
      description: 'Enabled REST guards in this view',
    },
    {
      label: 'Global',
      value: globalGuardCount.value,
      description: 'Apply to every REST route',
    },
    {
      label: 'Route-specific',
      value: routeGuardCount.value,
      description: 'Bound to one REST route',
    },
  ];
});

registerHeaderActions([
  {
    id: 'filter-guards',
    icon: 'lucide:filter',
    get label() {
      return filterLabel.value;
    },
    get variant() {
      return filterVariant.value;
    },
    get color() {
      return filterColor.value;
    },
    size: 'md',
    onClick: () => {
      showFilterDrawer.value = true;
    },
    permission: {
      and: [
        {
          route: '/enfyra_guard',
          methods: ['GET'],
        },
      ],
    },
  },
  {
    id: 'create-guard',
    label: 'New Guard',
    icon: 'lucide:plus',
    variant: 'solid',
    color: 'primary',
    size: 'md',
    onClick: () => {
      void openCreateGuardDrawer(activeType.value === 'graphql' ? 'graphql' : 'route');
    },
    permission: {
      and: [
        {
          route: '/enfyra_guard',
          methods: ['POST'],
        },
      ],
    },
  },
]);

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;

  if (page.value === 1) {
    await fetchGuards();
  } else {
    const newQuery = { ...route.query };
    delete newQuery.page;
    await router.replace({ query: newQuery });
  }
}

async function clearFilters() {
  await handleFilterApply(createEmptyFilter());
}

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchGuards();
  },
  { immediate: true },
);

async function handleTypeChange(value: string | number) {
  const nextType = value === 'graphql' ? 'graphql' : 'route';
  if (nextType === activeType.value) return;

  suppressListTransition.value = true;
  switchingType.value = true;
  activeType.value = nextType;
  page.value = 1;
  try {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await fetchGuards();
    if (guardsRefreshing.value) {
      await new Promise<void>((resolve) => {
        const stop = watch(guardsRefreshing, (refreshing) => {
          if (refreshing) return;
          stop();
          resolve();
        });
      });
    }
  } finally {
    switchingType.value = false;
    await nextTick();
    suppressListTransition.value = false;
  }
}

const {
  data: routesData,
  pending: routesLoading,
  execute: fetchRoutes,
} = useApi(() => '/enfyra_route', {
  query: {
    fields: GUARD_ROUTE_OPTION_FIELDS,
    sort: 'path',
    limit: 500,
  },
  immediate: false,
  errorContext: 'Fetch Routes',
});

const routeOptions = computed(() =>
  (routesData.value?.data || []).map((item: any) => ({
    label: item.path,
    value: getId(item),
  })),
);

const {
  data: tablesData,
  pending: tablesLoading,
  execute: fetchTables,
} = useApi(() => '/enfyra_table', {
  query: {
    fields: 'id,name,alias',
    sort: 'name',
    limit: 500,
  },
  immediate: false,
  errorContext: 'Fetch Tables',
});

const tableOptions = computed(() =>
  (tablesData.value?.data || []).map((item: any) => ({
    label: item.alias || item.name,
    value: getId(item),
  })),
);
const hasLoadedTables = computed(() => Boolean(tablesData.value?.data?.length));

async function ensureTablesLoaded() {
  if (hasLoadedTables.value || tablesLoading.value) return;
  await fetchTables();
}

const { execute: updateGuardApi, error: updateError } = useApi(
  () => '/enfyra_guard',
  {
    method: 'patch',
    errorContext: 'Toggle Guard',
  },
);
const togglingGuardId = ref<string | number | null>(null);

const { execute: deleteGuardApi, error: deleteError } = useApi(
  () => '/enfyra_guard',
  {
    method: 'delete',
    errorContext: 'Delete Guard',
  },
);

const {
  data: createGuardData,
  error: createGuardError,
  execute: createGuardApi,
  pending: createGuardLoading,
} = useApi(() => '/enfyra_guard', {
  method: 'post',
  errorContext: 'Create Guard',
});

const {
  error: createRuleError,
  execute: createRuleApi,
} = useApi(() => '/enfyra_guard_rule', {
  method: 'post',
  errorContext: 'Create Guard Rule',
});

const showCreateGuardDrawer = ref(false);
const createScope = ref<GuardScope>('global');
const selectedTemplate = ref<string | null>(null);
const selectedRouteId = ref<string | null>(null);
const selectedTableId = ref<string | null>(null);
const createTemplates = computed(() => getGuardTemplatesForScope(createScope.value));
const hasLoadedRoutes = computed(() => Boolean(routesData.value?.data?.length));

async function ensureRoutesLoaded() {
  if (hasLoadedRoutes.value || routesLoading.value) return;
  await fetchRoutes();
}

function setCreateScope(scope: GuardScope) {
  createScope.value = scope;
  selectedTemplate.value = getGuardTemplatesForScope(scope)[0]?.key || null;
  selectedRouteId.value = null;
  selectedTableId.value = null;
}

function closeCreateGuardDrawer() {
  showCreateGuardDrawer.value = false;
}

async function openCreateGuardDrawer(scope: GuardScope) {
  createScope.value = scope;
  selectedTemplate.value = createTemplates.value[0]?.key || null;
  selectedRouteId.value = null;
  selectedTableId.value = null;
  showCreateGuardDrawer.value = true;
  if (scope === 'route') {
    void ensureRoutesLoaded();
  } else if (scope === 'graphql') {
    void ensureTablesLoaded();
  }
}

watch(createScope, (scope) => {
  if (!showCreateGuardDrawer.value) return;
  if (scope === 'route') {
    void ensureRoutesLoaded();
  } else if (scope === 'graphql') {
    void ensureTablesLoaded();
  }
});

async function createGuardFromTemplate() {
  const template = getGuardTemplate(selectedTemplate.value);
  if (!template) {
    notify.error('Validation Error', 'Select a guard template');
    return;
  }
  if (createScope.value === 'route' && !selectedRouteId.value) {
    notify.error('Validation Error', 'Select a route for this guard');
    return;
  }
  if (createScope.value === 'graphql' && !selectedTableId.value) {
    notify.error('Validation Error', 'Select a table for this guard');
    return;
  }

  const routeItem = (routesData.value?.data || []).find((item: any) => String(getId(item)) === String(selectedRouteId.value));

  await createGuardApi({
    body: buildGuardBodyFromTemplate(template, {
      scope: createScope.value,
      idField,
      routeId: selectedRouteId.value,
      routePath: routeItem?.path,
      tableId: selectedTableId.value,
      gqlOperation: template.targetType === 'graphql' ? template.gqlOperation ?? null : null,
    }),
  });
  if (createGuardError.value) return;

  const createdGuard = createGuardData.value?.data?.[0];
  const createdGuardId = createdGuard ? getId(createdGuard) : null;
  if (createdGuardId) {
    await createRuleApi({
      body: buildGuardRuleBodyFromTemplate(template, {
        idField,
        guardId: createdGuardId,
      }),
    });
    if (createRuleError.value) return;
  }

  showCreateGuardDrawer.value = false;
  await nextTick();
  await navigateTo(`/settings/guards/${createdGuardId}`);
}

const positionColorMap: Record<string, string> = {
  pre_auth: 'warning',
  post_auth: 'info',
};

const combinatorColorMap: Record<string, string> = {
  and: 'primary',
  or: 'secondary',
};

function getGuardHeaderActions(guard: any) {
  return [
    {
      component: 'USwitch',
      props: {
        'model-value': guard.isEnabled,
        loading: togglingGuardId.value === getId(guard),
      },
      onClick: (e?: Event) => e?.stopPropagation(),
      onUpdate: () => toggleEnabled(guard),
    },
  ];
}

function getGuardFooterActions(guard: any) {
  return [
    {
      label: 'Delete',
      props: {
        icon: 'i-lucide-trash-2',
        variant: 'solid',
        color: 'error',
        size: 'sm',
      },
      onClick: (e?: Event) => {
        e?.stopPropagation();
        deleteGuard(guard);
      },
    },
  ];
}

async function toggleEnabled(guard: any) {
  const newEnabled = !guard.isEnabled;
  togglingGuardId.value = getId(guard);

  if (apiData.value?.data) {
    const idx = apiData.value.data.findIndex(
      (g: any) => getId(g) === getId(guard),
    );
    if (idx !== -1) {
      apiData.value.data[idx].isEnabled = newEnabled;
    }
  }

  try {
    await updateGuardApi({ id: getId(guard), body: { isEnabled: newEnabled } });

    if (updateError.value) {
      if (apiData.value?.data) {
        const idx = apiData.value.data.findIndex(
          (g: any) => getId(g) === getId(guard),
        );
        if (idx !== -1) {
          apiData.value.data[idx].isEnabled = !newEnabled;
        }
      }
      return;
    }

    notify.success('Success', `Guard ${newEnabled ? 'enabled' : 'disabled'} successfully`);
  } finally {
    togglingGuardId.value = null;
  }
}

async function deleteGuard(guard: any) {
  const isConfirmed = await confirm({
    title: 'Delete Guard',
    content: `Are you sure you want to delete guard "${guard.name}"? All child guards and rules will also be deleted. This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });

  if (isConfirmed) {
    await deleteGuardApi({ id: getId(guard) });

    if (deleteError.value) return;

    await fetchGuards();

    notify.success('Success', `Guard "${guard.name}" has been deleted successfully!`);
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="overflow-x-auto overflow-y-hidden">
      <UTabs
        :model-value="activeType"
        :items="guardTabItems"
        :content="false"
        variant="link"
        @update:model-value="handleTypeChange"
      />
    </div>

    <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="surface-card rounded-lg p-4"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-quaternary)]">
          {{ card.label }}
        </p>
        <USkeleton v-if="isPageLoading" class="mt-2 h-8 w-12" />
        <p v-else class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          {{ card.value }}
        </p>
        <USkeleton v-if="isPageLoading" class="mt-1 h-4 w-44 max-w-full" />
        <p v-else class="mt-1 text-xs text-[var(--text-tertiary)]">
          {{ card.description }}
        </p>
      </div>
    </section>

    <FilterActiveSummary
      v-if="hasActiveFilters(currentFilter)"
      :count="activeFilterCount"
      @clear="clearFilters"
    />

    <div class="guard-list-stage grid min-h-[22rem] grid-cols-[minmax(0,1fr)]">
      <Transition name="loading-fade" mode="out-in" :css="!suppressListTransition">
        <div
          :key="listStateKey"
          class="col-start-1 row-start-1 min-w-0"
        >
          <CommonResourceListFrame
            v-if="isPageLoading"
            :loading="true"
            :has-items="false"
            :skeleton-rows="4"
            loading-title="Loading guards..."
            :loading-description="activeType === 'graphql'
              ? 'Fetching GraphQL guard configuration'
              : 'Fetching route guard configuration'"
          />

          <div v-else-if="guardsData.length" class="space-y-6">
            <div class="eapp-resource-list">
              <CommonResourceListItem
                v-for="guard in guardsData"
                :key="getId(guard)"
                :title="guard.name"
                :description="guard.type === 'graphql'
                  ? `${guard.table?.alias || guard.table?.name || 'All tables'} · ${guard.gqlOperation || 'All operations'}`
                  : (guard.description || (guard.isGlobal ? 'Global guard' : guard.route?.path || 'No route assigned'))"
                icon="lucide:shield"
                icon-color="primary"
                :to="`/settings/guards/${getId(guard)}`"
                :stats="[
                  {
                    label: 'Status',
                    component: 'UBadge',
                    props: {
                      variant: 'soft',
                      color: guard.isEnabled ? 'success' : 'warning',
                    },
                    value: guard.isEnabled ? 'Enabled' : 'Disabled',
                  },
                  {
                    label: 'Position',
                    component: guard.position ? 'UBadge' : undefined,
                    props: guard.position ? {
                      variant: 'soft',
                      color: positionColorMap[guard.position] || 'neutral',
                    } : undefined,
                    value: guard.position === 'pre_auth' ? 'Pre-Auth' : guard.position === 'post_auth' ? 'Post-Auth' : '-',
                  },
                  ...(guard.type === 'graphql'
                    ? [{
                        label: 'Operation',
                        component: 'UBadge',
                        props: {
                          variant: 'soft',
                          color: 'warning',
                        },
                        value: guard.gqlOperation || 'All',
                      }]
                    : [{
                        label: 'Scope',
                        component: 'UBadge',
                        props: {
                          variant: 'soft',
                          color: guard.isGlobal ? 'error' : 'neutral',
                        },
                        value: guard.isGlobal ? 'Global' : 'Route-specific',
                      }]),
                  {
                    label: 'Combinator',
                    component: 'UBadge',
                    props: {
                      variant: 'soft',
                      color: combinatorColorMap[guard.combinator] || 'neutral',
                    },
                    value: (guard.combinator || 'and').toUpperCase(),
                  },
                ]"
                :methods="getGuardFooterActions(guard)"
                :header-actions="getGuardHeaderActions(guard)"
              />
            </div>

            <CommonPaginationBar
              v-if="total > pageLimit"
              v-model:page="page"
              :items-per-page="pageLimit"
              :total="total"
              :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
            />
          </div>

          <CommonEmptyState
            v-else
            :title="activeType === 'graphql' ? 'No GraphQL guards found' : 'No route guards found'"
            :description="activeType === 'graphql'
              ? 'Create a GraphQL guard to limit queries or mutations by table and operation.'
              : 'Create a route guard to add rate limiting or IP filtering to REST endpoints.'"
            :icon="activeType === 'graphql' ? 'lucide:braces' : 'lucide:shield'"
            size="sm"
          />
        </div>
      </Transition>
    </div>

    <FilterDrawerLazy
      v-model="showFilterDrawer"
      :table-name="tableName"
      :current-filter="currentFilter"
      :allowed-fields="activeFilterFields"
      :history-key="`enfyra_guard:${activeType}`"
      :title="activeType === 'graphql' ? 'Filter GraphQL Guards' : 'Filter Route Guards'"
      @apply="handleFilterApply"
    />

    <CommonDrawer
      v-model="showCreateGuardDrawer"
      :handle="false"
      direction="right"
      :cancel-action="{ label: 'Cancel', onClick: closeCreateGuardDrawer }"
      :primary-action="{
        label: 'Create Guard',
        loading: createGuardLoading,
        disabled: createGuardLoading
          || !selectedTemplate
          || (createScope === 'route' && !selectedRouteId)
          || (createScope === 'graphql' && !selectedTableId),
        onClick: createGuardFromTemplate,
      }"
    >
      <template #header>
        <h2 class="text-xl font-semibold">Create Guard</h2>
      </template>

      <template #body>
        <div class="space-y-6">
          <section class="space-y-3">
            <UFormField label="Scope">
              <div class="grid grid-cols-3 gap-2">
                <UButton
                  :variant="createScope === 'global' ? 'solid' : 'soft'"
                  :color="createScope === 'global' ? 'primary' : 'neutral'"
                  icon="lucide:globe-2"
                  block
                  @click="setCreateScope('global')"
                >
                  Global
                </UButton>
                <UButton
                  :variant="createScope === 'route' ? 'solid' : 'soft'"
                  :color="createScope === 'route' ? 'primary' : 'neutral'"
                  icon="lucide:route"
                  block
                  @click="setCreateScope('route')"
                >
                  Route
                </UButton>
                <UButton
                  :variant="createScope === 'graphql' ? 'solid' : 'soft'"
                  :color="createScope === 'graphql' ? 'primary' : 'neutral'"
                  icon="lucide:braces"
                  block
                  @click="setCreateScope('graphql')"
                >
                  GraphQL
                </UButton>
              </div>
            </UFormField>

            <UFormField
              v-if="createScope === 'route'"
              label="Route"
              required
            >
              <USelect
                v-model="selectedRouteId"
                :items="routeOptions"
                value-key="value"
                class="w-full"
                :loading="routesLoading"
                :disabled="routesLoading && routeOptions.length === 0"
                :placeholder="routesLoading ? 'Loading routes...' : 'Select route'"
              />
            </UFormField>

            <UFormField
              v-if="createScope === 'graphql'"
              label="Table"
              required
            >
              <USelect
                v-model="selectedTableId"
                :items="tableOptions"
                value-key="value"
                class="w-full"
                :loading="tablesLoading"
                :disabled="tablesLoading && tableOptions.length === 0"
                :placeholder="tablesLoading ? 'Loading tables...' : 'Select table'"
              />
            </UFormField>
          </section>

          <section class="space-y-3">
            <div>
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">
                Templates
              </h3>
              <p class="text-xs text-[var(--text-tertiary)]">
                A template creates the root guard and the first rule in one step.
              </p>
            </div>
            <div class="px-px">
              <GuardTemplateGrid
                v-model="selectedTemplate"
                :templates="createTemplates"
              />
            </div>
          </section>
        </div>
      </template>

    </CommonDrawer>
  </div>
</template>
