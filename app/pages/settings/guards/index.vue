<script setup lang="ts">
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
const tableName = 'guard_definition';
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { createEmptyFilter, buildQuery, hasActiveFilters, countActiveFilters } = useFilterQuery();
const { isTablet } = useScreen();
const { isMounted } = useMounted();
const { registerPageHeader } = usePageHeaderRegistry();
const { getId, getIdFieldName } = useDatabase();
const idField = getIdFieldName();

registerPageHeader({
  title: 'Guard Manager',
  gradient: 'purple',
});

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());
const activeScope = ref<'all' | GuardScope>('all');
const activeFilterCount = computed(() => countActiveFilters(currentFilter.value));

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
} = useApi(() => '/guard_definition', {
  query: computed(() => {
    const conditions: any[] = [
      { parent: { _is_null: true } },
    ];
    if (activeScope.value === 'global') {
      conditions.push({ isGlobal: { _eq: true } });
    } else if (activeScope.value === 'route') {
      conditions.push({ isGlobal: { _eq: false } });
    }

    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : null;
    if (filterQuery) {
      conditions.push(filterQuery);
    }

    return {
      fields: getIncludeFields(),
      sort: 'priority',
      meta: '*',
      page: page.value,
      limit: pageLimit,
      filter: { _and: conditions },
    };
  }),
  errorContext: 'Fetch Guards',
});

const guardsData = computed(() => apiData.value?.data || []);
const showInitialLoading = computed(() => !isMounted.value || (loading.value && !apiData.value));
const globalGuardCount = computed(() => guardsData.value.filter((guard: any) => guard.isGlobal).length);
const routeGuardCount = computed(() => guardsData.value.filter((guard: any) => !guard.isGlobal).length);
const enabledGuardCount = computed(() => guardsData.value.filter((guard: any) => guard.isEnabled).length);
const total = computed(() => {
  if (hasActiveFilters(currentFilter.value)) {
    return apiData.value?.meta?.filterCount ?? 0;
  }
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry([
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
          route: '/guard_definition',
          actions: ['read'],
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
    onClick: () => openCreateGuardDrawer('global'),
    permission: {
      and: [
        {
          route: '/guard_definition',
          actions: ['create'],
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

watch(activeScope, async () => {
  page.value = 1;
  await fetchGuards();
});

const {
  data: routesData,
  execute: fetchRoutes,
} = useApi(() => '/route_definition', {
  query: {
    fields: '*,availableMethods.method',
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

const { execute: updateGuardApi, error: updateError } = useApi(
  () => '/guard_definition',
  {
    method: 'patch',
    errorContext: 'Toggle Guard',
  },
);

const { execute: deleteGuardApi, error: deleteError } = useApi(
  () => '/guard_definition',
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
} = useApi(() => '/guard_definition', {
  method: 'post',
  errorContext: 'Create Guard',
});

const {
  error: createRuleError,
  execute: createRuleApi,
} = useApi(() => '/guard_rule_definition', {
  method: 'post',
  errorContext: 'Create Guard Rule',
});

const showCreateGuardDrawer = ref(false);
const createScope = ref<GuardScope>('global');
const selectedTemplate = ref<string | null>(null);
const selectedRouteId = ref<string | null>(null);
const createTemplates = computed(() => getGuardTemplatesForScope(createScope.value));

async function openCreateGuardDrawer(scope: GuardScope) {
  createScope.value = scope;
  selectedTemplate.value = createTemplates.value[0]?.key || null;
  selectedRouteId.value = null;
  if (!routesData.value?.data?.length) await fetchRoutes();
  showCreateGuardDrawer.value = true;
}

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

  const routeItem = (routesData.value?.data || []).find((item: any) => String(getId(item)) === String(selectedRouteId.value));

  await createGuardApi({
    body: buildGuardBodyFromTemplate(template, {
      scope: createScope.value,
      idField,
      routeId: selectedRouteId.value,
      routePath: routeItem?.path,
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
  notify.success('Success', 'Guard created successfully');
  await fetchGuards();
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

  if (apiData.value?.data) {
    const idx = apiData.value.data.findIndex(
      (g: any) => getId(g) === getId(guard),
    );
    if (idx !== -1) {
      apiData.value.data[idx].isEnabled = newEnabled;
    }
  }

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
    <Transition name="loading-fade" mode="out-in">
      <div v-if="showInitialLoading">
        <CommonLoadingState
          title="Loading guards..."
          description="Fetching guard configuration"
          size="sm"
          type="card"
          context="page"
        />
      </div>

      <div v-else class="space-y-6">
        <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="surface-card rounded-lg p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-quaternary)]">
              Active
            </p>
            <p class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {{ enabledGuardCount }}
            </p>
            <p class="mt-1 text-xs text-[var(--text-tertiary)]">
              Enabled root guards in this view
            </p>
          </div>
          <div class="surface-card rounded-lg p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-quaternary)]">
              Global
            </p>
            <p class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {{ globalGuardCount }}
            </p>
            <p class="mt-1 text-xs text-[var(--text-tertiary)]">
              Apply to every detected route
            </p>
          </div>
          <div class="surface-card rounded-lg p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-quaternary)]">
              Route
            </p>
            <p class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {{ routeGuardCount }}
            </p>
            <p class="mt-1 text-xs text-[var(--text-tertiary)]">
              Bound to one route
            </p>
          </div>
        </section>

        <section class="surface-card rounded-lg p-3">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="item in [
                  { label: 'All', value: 'all' },
                  { label: 'Global', value: 'global' },
                  { label: 'Route', value: 'route' },
                ]"
                :key="item.value"
                size="sm"
                :variant="activeScope === item.value ? 'solid' : 'soft'"
                :color="activeScope === item.value ? 'primary' : 'neutral'"
                @click="activeScope = item.value as any"
              >
                {{ item.label }}
              </UButton>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                icon="lucide:globe-2"
                label="Global template"
                size="sm"
                color="primary"
                variant="solid"
                @click="openCreateGuardDrawer('global')"
              />
              <UButton
                icon="lucide:route"
                label="Route template"
                size="sm"
                color="neutral"
                variant="soft"
                @click="openCreateGuardDrawer('route')"
              />
            </div>
          </div>
        </section>

        <FilterActiveSummary
          v-if="hasActiveFilters(currentFilter)"
          :count="activeFilterCount"
          @clear="clearFilters"
        />

        <div v-if="guardsData.length" class="space-y-6">
          <CommonAnimatedGrid
            :grid-class="
              isTablet
                ? 'grid gap-4 grid-cols-2'
                : 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
            "
          >
            <CommonSettingsCard
              v-for="guard in guardsData"
              :key="getId(guard)"
              :title="guard.name"
              :description="guard.description || (guard.isGlobal ? 'Global guard' : guard.route?.path || 'No route assigned')"
              icon="lucide:shield"
              icon-color="warning"
              :card-class="'cursor-pointer transition-all'"
              @click="navigateTo(`/settings/guards/${getId(guard)}`)"
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
                {
                  label: 'Scope',
                  component: 'UBadge',
                  props: {
                    variant: 'soft',
                    color: guard.isGlobal ? 'error' : 'neutral',
                  },
                  value: guard.isGlobal ? 'Global' : 'Route-specific',
                },
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
              :actions="getGuardFooterActions(guard)"
              :header-actions="getGuardHeaderActions(guard)"
            />
          </CommonAnimatedGrid>
        </div>

        <CommonEmptyState
          v-else
          title="No guards found"
          description="No guard configurations have been created yet. Create a guard to add rate limiting or IP filtering."
          icon="lucide:shield"
          size="sm"
        />

        <CommonPaginationBar
          v-if="guardsData.length > 0 && total > pageLimit"
          v-model:page="page"
          class="mt-6"
          :items-per-page="pageLimit"
          :total="total"
          :loading="loading"
          :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
        />
      </div>
    </Transition>
  </div>

  <FilterDrawerLazy
    v-model="showFilterDrawer"
    :table-name="tableName"
    :current-filter="currentFilter"
    @apply="handleFilterApply"
  />

  <CommonDrawer
    v-model="showCreateGuardDrawer"
    :handle="false"
    direction="right"
  >
    <template #header>
      <h2 class="text-xl font-semibold">Create Guard</h2>
    </template>

    <template #body>
      <div class="space-y-6">
        <section class="space-y-3">
          <UFormField label="Scope">
            <div class="grid grid-cols-2 gap-2">
              <UButton
                :variant="createScope === 'global' ? 'solid' : 'soft'"
                :color="createScope === 'global' ? 'primary' : 'neutral'"
                icon="lucide:globe-2"
                block
                @click="createScope = 'global'"
              >
                Global
              </UButton>
              <UButton
                :variant="createScope === 'route' ? 'solid' : 'soft'"
                :color="createScope === 'route' ? 'primary' : 'neutral'"
                icon="lucide:route"
                block
                @click="createScope = 'route'"
              >
                Route
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
              placeholder="Select route"
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
          <GuardTemplateGrid
            v-model="selectedTemplate"
            :templates="createTemplates"
          />
        </section>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="outline"
          color="neutral"
          @click="showCreateGuardDrawer = false"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          :loading="createGuardLoading"
          :disabled="createGuardLoading"
          @click="createGuardFromTemplate"
        >
          Create Guard
        </UButton>
      </div>
    </template>
  </CommonDrawer>
</template>
