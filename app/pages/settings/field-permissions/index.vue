<script setup lang="ts">
const notify = useNotify();
const route = useRoute();
const router = useRouter();
const { confirm } = useConfirm();
const { isMounted } = useMounted();
const { isTablet } = useScreen();
const { registerPageHeader } = usePageHeaderRegistry();
const { getId, getIdFieldName } = useDatabase();

const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();

registerPageHeader({
  title: "Field Permissions",
  description: "Manage field-level allow/deny rules and overrides",
  gradient: "purple",
});

const page = ref(1);
const pageLimit = 9;

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());

const quickScope = computed(() => {
  const q = route.query;
  return {
    column: q.column ? String(q.column) : null,
    relation: q.relation ? String(q.relation) : null,
    role: q.role ? String(q.role) : null,
    user: q.user ? String(q.user) : null,
  };
});

const filterLabel = computed(() => {
  const activeCount = currentFilter.value.conditions.length;
  const quickCount = Object.values(quickScope.value).filter(Boolean).length;
  const total = activeCount + quickCount;
  return total > 0 ? `Filters (${total})` : "Filter";
});

const filterVariant = computed(() =>
  hasActiveFilters(currentFilter.value) || Object.values(quickScope.value).some(Boolean)
    ? "solid"
    : "outline"
);

const filterColor = computed(() =>
  hasActiveFilters(currentFilter.value) || Object.values(quickScope.value).some(Boolean)
    ? "secondary"
    : "neutral"
);

function buildQuickFilter(): Record<string, any> | null {
  const conditions: any[] = [];
  if (quickScope.value.column) {
    conditions.push({ column: { [getIdFieldName()]: { _eq: quickScope.value.column } } });
  }
  if (quickScope.value.relation) {
    conditions.push({ relation: { [getIdFieldName()]: { _eq: quickScope.value.relation } } });
  }
  if (quickScope.value.role) {
    conditions.push({ role: { [getIdFieldName()]: { _eq: quickScope.value.role } } });
  }
  if (quickScope.value.user) {
    conditions.push({ allowedUsers: { [getIdFieldName()]: { _eq: quickScope.value.user } } });
  }
  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return { _and: conditions };
}

const {
  data: apiData,
  pending: loading,
  execute: fetchPermissions,
} = useApi(() => "/field_permission_definition", {
  query: computed(() => {
    const conditions: any[] = [];

    const quick = buildQuickFilter();
    if (quick) conditions.push(quick);

    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : null;
    if (filterQuery && Object.keys(filterQuery).length) conditions.push(filterQuery);

    return {
      fields:
        "id,name,updatedAt,effect,decision,action,condition,role.id,role.name,column.id,column.name,relation.id,relation.propertyName,allowedUsers.id,allowedUsers.email,allowedUsers.name",
      sort: "-updatedAt",
      meta: "*",
      page: page.value,
      limit: pageLimit,
      ...(conditions.length ? { filter: { _and: conditions } } : {}),
    };
  }),
  errorContext: "Fetch Field Permissions",
});

const items = computed(() => apiData.value?.data || []);
const total = computed(() => {
  if (hasActiveFilters(currentFilter.value)) {
    return apiData.value?.meta?.filterCount ?? 0;
  }
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry([
  {
    id: "filter-field-permissions",
    icon: "lucide:filter",
    get label() {
      return filterLabel.value;
    },
    get variant() {
      return filterVariant.value;
    },
    get color() {
      return filterColor.value;
    },
    size: "md",
    onClick: () => {
      showFilterDrawer.value = true;
    },
    permission: {
      and: [{ route: "/field_permission_definition", actions: ["read"] }],
    },
  },
]);

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchPermissions();
  },
  { immediate: true }
);

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  if (page.value === 1) {
    await fetchPermissions();
  } else {
    const newQuery = { ...route.query };
    delete newQuery.page;
    await router.replace({ query: newQuery });
  }
}

const { execute: deleteApi, error: deleteError } = useApi(
  () => "/field_permission_definition",
  { method: "delete", errorContext: "Delete Field Permission" }
);

async function removeItem(item: any) {
  const ok = await confirm({
    title: "Delete Rule",
    content: "Delete this field permission rule? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
  });
  if (!ok) return;

  await deleteApi({ id: getId(item) });
  if (deleteError.value) return;
  notify.success("Success", "Rule deleted");
  await fetchPermissions();
}

function getRuleDescription(item: any): string {
  const fieldLabel = item?.column?.name
    ? `column:${item.column.name}`
    : item?.relation?.propertyName
      ? `relation:${item.relation.propertyName}`
      : "field";
  const scope =
    item?.allowedUsers?.length
      ? `${item.allowedUsers.length} user(s)`
      : item?.role?.name
        ? `role:${item.role.name}`
        : "public";
  return `${fieldLabel} • ${scope}`;
}

function getRuleStats(item: any) {
  const effect = String(item?.effect ?? item?.decision ?? "allow");
  const actions = Array.isArray(item?.actions) ? item.actions : [];
  const hasCondition = !!item?.condition;
  return [
    {
      label: "Effect",
      component: "UBadge",
      props: {
        variant: "soft",
        color: effect === "deny" ? "error" : "success",
      },
      value: effect.toUpperCase(),
    },
    {
      label: "Actions",
      component: "UBadge",
      props: { variant: "soft", color: "neutral" },
      value: actions.length ? actions.join(", ") : "-",
    },
    {
      label: "Condition",
      component: "UBadge",
      props: { variant: "soft", color: hasCondition ? "info" : "neutral" },
      value: hasCondition ? "Conditional" : "Unconditional",
    },
  ];
}
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <div v-if="loading || !isMounted">
        <CommonLoadingState
          title="Loading field permissions..."
          description="Fetching rules and overrides"
          size="sm"
          type="card"
          context="page"
        />
      </div>

      <div v-else class="space-y-6">
        <div v-if="items.length" class="space-y-6">
          <div
            class="grid gap-4"
            :class="
              isTablet
                ? 'grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
            "
          >
            <CommonSettingsCard
              v-for="item in items"
              :key="getId(item)"
              :title="item.name || 'Field permission rule'"
              :description="getRuleDescription(item)"
              icon="lucide:lock"
              icon-color="warning"
              :card-class="'cursor-pointer transition-all'"
              @click="navigateTo(`/settings/field-permissions/${getId(item)}`)"
              :stats="getRuleStats(item)"
              :header-actions="[
                {
                  component: 'UButton',
                  props: {
                    icon: 'i-lucide-trash-2',
                    variant: 'ghost',
                    color: 'error',
                    size: 'xs',
                    class: 'rounded-full !aspect-square',
                  },
                  onClick: (e?: Event) => {
                    e?.stopPropagation();
                    removeItem(item);
                  },
                },
              ]"
            />
          </div>
        </div>

        <CommonEmptyState
          v-else
          title="No field permission rules found"
          description="Create a rule to allow or deny read/create/update for specific fields."
          icon="lucide:lock"
          size="sm"
        />

        <div
          v-if="items.length > 0 && total > pageLimit"
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
    table-name="field_permission_definition"
    :current-filter="currentFilter"
    @apply="handleFilterApply"
  />
</template>

