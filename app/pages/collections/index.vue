<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { defineComponent, h } from "vue";
import CommonSystemVisibilityControl from "~/components/common/SystemVisibilityControl.vue";
import type { SystemVisibilityMode } from "~/types/ui";

const page = ref(1);
const pageLimit = 10;
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
      limit: pageLimit,
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
  () => [route.query.page, route.query.scope, route.query.system],
  async ([newPage]) => {
    page.value = newPage ? Number(newPage) : 1;
    await fetchCollections();
  },
  { immediate: true }
);

function getFieldCount(collection: any): number {
  return (collection.columns?.length ?? 0) + (collection.relations?.length ?? 0);
}

function formatCollectionDate(value: string | undefined): string {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}

</script>

<template>
  <CommonResourceListFrame
    v-model:page="page"
    :loading="showInitialLoading"
    :has-items="displayedCollections.length > 0"
    loading-title="Loading collections..."
    loading-description="Fetching table collections"
    empty-icon="lucide:database"
    :empty-title="searchQuery ? 'No results found' : 'No collections found'"
    :empty-description="searchQuery ? 'No tables found matching your search' : 'No table collections have been created yet'"
    :total="total"
    :items-per-page="pageLimit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
  >
      <CommonResourceListItem
        v-for="collection in displayedCollections"
        :key="collection.id"
        :title="collection.name || 'Untitled Collection'"
        :description="collection.description || 'No description'"
        icon="lucide:database"
        :icon-color="collection.isSystem ? 'neutral' : 'primary'"
        :loading="collectionsRefreshing"
        :to="`/collections/${collection.name}`"
      >
        <template #metadata>
          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <UBadge color="primary" variant="soft" size="xs">
              {{ getFieldCount(collection) }} fields
            </UBadge>
            <UBadge color="neutral" variant="soft" size="xs">
              {{ collection.isSystem ? "System" : "Custom" }}
            </UBadge>
            <UBadge color="info" variant="soft" size="xs">
              /{{ collection.name }}
            </UBadge>
            <UBadge color="neutral" variant="soft" size="xs">
              {{ formatCollectionDate(collection.createdAt) }}
            </UBadge>
          </div>
        </template>
      </CommonResourceListItem>
  </CommonResourceListFrame>
</template>
