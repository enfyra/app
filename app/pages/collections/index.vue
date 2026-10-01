<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { defineComponent, h } from "vue";
import { UBadge } from "#components";
import type { ColumnDef } from "@tanstack/vue-table";
import CommonSystemVisibilityControl from "~/components/common/SystemVisibilityControl.vue";
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

const SearchInput = defineComponent({
  setup() {
    const UInput = resolveComponent("UInput");
    const UIcon = resolveComponent("UIcon");

    return () =>
      h("div", { class: "relative flex h-9 items-center" }, [
        h(UInput, {
          modelValue: searchQuery.value,
          "onUpdate:modelValue": (val: string) => (searchQuery.value = val),
          placeholder: "Search by table name...",
          icon: "lucide:search",
          size: "md",
          ui: { base: "!h-9 !py-0" },
          class: "w-full lg:w-64",
        }),
        searchQuery.value
          ? h("button", {
              class: "absolute right-1 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-quaternary)] hover:text-[var(--text-tertiary)] cursor-pointer",
              "aria-label": "Clear search",
              type: "button",
              onClick: () => {
                searchQuery.value = "";
              },
            }, [
              h(UIcon, { name: "lucide:x", class: "w-4 h-4" }),
            ])
          : null,
      ]);
  },
});

registerSubHeaderActions([
  {
    id: "toggle-system-collections",
    component: CommonSystemVisibilityControl,
    get props() {
      return {
        modelValue: visibilityScope.value,
        label: "Tables",
        "onUpdate:modelValue": (value: SystemVisibilityMode) => {
          visibilityScope.value = value;
          page.value = 1;
        },
      };
    },
    side: "right",
    order: 0,
  },
  {
    id: "search-collections",
    component: SearchInput,
    side: "right",
    order: 1,
  },
]);

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
    meta: { style: { th: { width: '88px' }, td: { width: '88px' } } },
  },
  {
    id: 'apiPath',
    header: 'API path',
    enableSorting: false,
    accessorFn: collection => collection.name ? `/${collection.name}` : '_',
    cell: ({ getValue }) => h('span', { class: 'block truncate font-mono', title: String(getValue()) }, String(getValue())),
    meta: { style: { th: { width: '240px' }, td: { width: '240px' } } },
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
