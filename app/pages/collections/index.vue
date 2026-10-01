<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { h } from "vue";
import { UBadge } from "#components";
import type { ColumnDef } from "@tanstack/vue-table";
import type { SystemVisibilityMode } from "~/types/ui";
import { settingsDateColumn, settingsTextColumn } from "~/utils/settings-table";

const page = ref(1);
const pageLimit = useSettingsPageSize('collections');
const route = useRoute();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Collections",
  gradient: "purple",
});

const COLLECTION_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "isSystem",
  "createdAt",
  "columns.id",
  "relations.id",
].join(",");

const searchQuery = ref(typeof route.query.search === "string" ? route.query.search : "");
const visibilityScope = ref<SystemVisibilityMode>(getVisibilityScope(route.query.scope, route.query.system));
const router = useRouter();
const visibilityOptions = [
  { label: 'Custom', value: 'custom' as const },
  { label: 'System', value: 'system' as const },
  { label: 'All', value: 'all' as const },
];

function getVisibilityScope(scope: unknown, system: unknown): SystemVisibilityMode {
  if (scope === "custom" || scope === "system" || scope === "all") return scope;
  return system === "true" ? "all" : "custom";
}

watch(() => [route.query.scope, route.query.system], ([scope, system]) => {
  const next = getVisibilityScope(scope, system);
  if (visibilityScope.value !== next) {
    visibilityScope.value = next;
  }
});

watch(visibilityScope, (v) => {
  if (getVisibilityScope(route.query.scope, route.query.system) !== v) {
    const query = { ...route.query }
    delete query.system
    if (v === "custom") delete query.scope
    else query.scope = v
    router.replace({ query })
  }
})
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function syncSearchToUrl(value: string) {
  const query = { ...route.query };
  if (value) query.search = value;
  else delete query.search;
  if ((query.search ?? "") !== (route.query.search ?? "")) {
    router.replace({ query });
  }
}

watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);

  syncSearchToUrl(newVal);

  if (newVal === "") {
    page.value = 1;
    fetchCollections();
    return;
  }

  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchCollections();
  }, 550);
});

watch(
  () => route.query.search,
  (val) => {
    const next = typeof val === "string" ? val : "";
    if (searchQuery.value !== next) searchQuery.value = next;
  },
);

const {
  data: apiData,
  pending: loading,
  execute: fetchCollections,
} = useApi(() => "/enfyra_table", {
  query: computed(() => {
    const conditions: any[] = [];
    if (visibilityScope.value === "custom") {
      conditions.push({ isSystem: { _eq: false } });
    } else if (visibilityScope.value === "system") {
      conditions.push({ isSystem: { _eq: true } });
    }
    if (searchQuery.value) {
      conditions.push({ name: { _contains: searchQuery.value } });
    }
    return {
      fields: COLLECTION_LIST_FIELDS,
      sort: "-createdAt",
      meta: "totalCount,filterCount",
      page: page.value,
      limit: pageLimit.value,
      deep: { columns: { limit: 0 }, relations: { limit: 0 } },
      ...(conditions.length > 0 && {
        filter: { _and: conditions },
      }),
    };
  }),
  errorContext: "Fetch Collections",
});

const {
  items: displayedCollections,
  showInitialLoading,
  isRefreshing: collectionsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.filterCount ?? 0);
const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Collection'),
  settingsTextColumn('description', 'Description'),
  {
    id: 'fields',
    header: 'Fields',
    enableSorting: false,
    accessorFn: collection => (collection.columns?.length ?? 0) + (collection.relations?.length ?? 0),
  },
  {
    id: 'apiPath',
    header: 'API path',
    enableSorting: false,
    accessorFn: collection => collection.name ? `/${collection.name}` : '_',
    cell: ({ getValue }) => h('span', { class: 'block truncate font-mono', title: String(getValue()) }, String(getValue())),
  },
  {
    accessorKey: 'isSystem',
    header: 'Type',
    enableSorting: false,
    cell: ({ getValue }) => h(UBadge, { label: getValue() ? 'System' : 'Custom', color: 'neutral', variant: 'soft' }),
  },
  settingsDateColumn(),
];

async function setPageSize(size: number) {
  if (page.value !== 1) await router.replace({ query: { ...route.query, page: undefined } });
  pageLimit.value = size;
}

onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout);
});

registerHeaderActions({
  id: "create-collection",
  label: "Create Collection",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/collections/create",
  permission: {
    and: [
      {
        route: "/enfyra_table",
        methods: ["POST"],
      },
    ],
  },
});

watch(
  () => [route.query.page, route.query.scope, route.query.system, pageLimit.value],
  async ([newPage]) => {
    page.value = Math.max(1, Number(newPage) || 1);
    await fetchCollections();
  },
  { immediate: true }
);

</script>

<template>
  <div class="space-y-6">
    <DataTableSettingsTable
      v-model:page="page"
      :data="displayedCollections"
      :columns="columns"
      :loading="showInitialLoading || collectionsRefreshing"
      :page-limit="pageLimit"
      :total="total"
      page-size-key="collections"
      :pagination-loading="loading"
      :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
      @page-size-change="setPageSize"
      @row-click="collection => navigateTo(`/collections/${collection.name}`)"
    >
      <template #toolbar>
        <div class="flex w-full min-w-0 items-center gap-2 lg:gap-3">
          <UInput
            v-model="searchQuery"
            icon="lucide:search"
            placeholder="Search collections…"
            aria-label="Search collections by table name"
            size="sm"
            class="min-w-0 flex-1 lg:w-72 lg:flex-none"
            :ui="{ base: '!h-8 !py-0', trailing: 'pe-1' }"
          >
            <template v-if="searchQuery" #trailing>
              <UButton
                icon="lucide:x"
                aria-label="Clear search"
                color="neutral"
                variant="ghost"
                size="xs"
                class="size-6 p-0"
                @click="searchQuery = ''"
              />
            </template>
          </UInput>
          <USelect
            v-model="visibilityScope"
            :items="visibilityOptions"
            aria-label="Collection type"
            size="sm"
            class="w-26 shrink-0"
            @update:model-value="page = 1"
          />
        </div>
      </template>
      <template #empty>
        <CommonEmptyState
          variant="naked"
          icon="lucide:database"
          :title="searchQuery ? 'No results found' : 'No collections found'"
          :description="searchQuery ? 'No tables found matching your search' : 'No table collections have been created yet'"
          size="sm"
        />
      </template>
    </DataTableSettingsTable>
  </div>
</template>
