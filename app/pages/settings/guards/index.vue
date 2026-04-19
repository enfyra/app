<script setup lang="ts">
const notify = useNotify();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const router = useRouter();
const tableName = 'guard_definition';
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();
const { isTablet } = useScreen();
const { isMounted } = useMounted();
const { registerPageHeader } = usePageHeaderRegistry();
const { getId } = useDatabase();

registerPageHeader({
  title: 'Guard Manager',
  gradient: 'purple',
});

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());

const filterLabel = computed(() => {
  const activeCount = currentFilter.value.conditions.length;
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
    label: 'Create Guard',
    icon: 'lucide:plus',
    variant: 'solid',
    color: 'primary',
    size: 'md',
    to: '/settings/guards/create',
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

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchGuards();
  },
  { immediate: true },
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
      <div v-if="loading || !isMounted">
        <CommonLoadingState
          title="Loading guards..."
          description="Fetching guard configuration"
          size="sm"
          type="card"
          context="page"
        />
      </div>

      <div v-else class="space-y-6">
        <div v-if="guardsData.length" class="space-y-6">
          <div
            class="grid gap-4"
            :class="
              isTablet
                ? 'grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
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
          </div>
        </div>

        <CommonEmptyState
          v-else-if="!loading"
          title="No guards found"
          description="No guard configurations have been created yet. Create a guard to add rate limiting or IP filtering."
          icon="lucide:shield"
          size="sm"
        />

        <div
          v-if="!loading && guardsData.length > 0 && total > pageLimit"
          class="flex items-center justify-between mt-6"
        >
          <UPagination
            v-model:page="page"
            :items-per-page="pageLimit"
            :total="total"
            show-edges
            :sibling-count="1"
            :to="
              (p) => ({
                path: route.path,
                query: { ...route.query, page: p },
              })
            "
          />
          <p class="hidden md:block text-sm text-[var(--text-quaternary)]">
            Showing
            <span class="text-[var(--text-secondary)]"
              >{{ (page - 1) * pageLimit + 1 }}-{{
                Math.min(page * pageLimit, total)
              }}</span
            >
            of
            <span class="text-[var(--text-secondary)]">{{ total }}</span>
            results
          </p>
        </div>
      </div>
    </Transition>
  </div>

  <FilterDrawerLazy
    v-model="showFilterDrawer"
    :table-name="tableName"
    :current-filter="currentFilter"
    @apply="handleFilterApply"
  />
</template>
