<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { defineComponent, h } from "vue";
import CommonSystemVisibilityControl from "~/components/common/SystemVisibilityControl.vue";
import type { SystemVisibilityMode } from "~/types/ui";

const page = ref(1);
const pageLimit = 9;
const route = useRoute();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Collections",
  gradient: "purple",
});

const { schemas } = useSchema();
const COLLECTION_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "isSystem",
  "createdAt",
].join(",");

const searchQuery = ref("");
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

watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);

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

const SearchInput = defineComponent({
  setup() {
    const UInput = resolveComponent("UInput");
    const UIcon = resolveComponent("UIcon");

    return () =>
      h("div", { class: "relative flex items-center" }, [
        h(UInput, {
          modelValue: searchQuery.value,
          "onUpdate:modelValue": (val: string) => (searchQuery.value = val),
          placeholder: "Search by table name...",
          icon: "lucide:search",
          size: "lg",
          class: "w-full lg:w-64",
        }),
        searchQuery.value
          ? h("button", {
              class: "absolute right-2 p-1 text-[var(--text-quaternary)] hover:text-[var(--text-tertiary)] cursor-pointer",
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

function getFieldCount(collectionName: string): number {
  const schema = schemas.value[collectionName];
  if (!schema?.definition) return 0;
  
  return schema.definition.filter(
    (field: any) => field.name !== 'createdAt' && field.name !== 'updatedAt'
  ).length;
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
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
      <template #skeleton-row>
        <CommonResourceListSkeletonRow
          title-width="w-48"
          description-width="w-1/2 max-w-[28rem]"
          :chips="['w-16', 'w-16', 'w-24', 'w-20']"
          trailing-width="w-9"
        />
      </template>

      <CommonResourceListItem
        v-for="collection in displayedCollections"
        :key="collection.id"
        :title="collection.name || 'Untitled Collection'"
        :description="collection.description || 'No description'"
        icon="lucide:database"
        :icon-color="collection.isSystem ? 'error' : 'primary'"
        :content-loading="collectionsRefreshing"
        :actions="[
          {
            label: 'Open',
            to: `/collections/${collection.name}`,
            props: { icon: 'lucide:chevron-right', variant: 'ghost', color: 'neutral', size: 'xs' },
          },
        ]"
        @click="navigateTo(`/collections/${collection.name}`)"
      >
        <template #skeleton-content>
          <span class="block h-4 w-48 rounded skeleton-gradient skeleton-pulse-slow" />
          <span class="block h-3 w-1/2 max-w-[28rem] rounded skeleton-inline skeleton-pulse-slow" />
          <span class="flex flex-wrap gap-2">
            <span class="block h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
            <span class="block h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
            <span class="block h-5 w-24 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
            <span class="hidden h-5 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
          </span>
        </template>

        <template #skeleton-actions>
          <span class="hidden h-8 w-9 flex-shrink-0 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block" />
        </template>

        <template #metadata>
          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <UBadge color="primary" variant="soft" size="xs">
              {{ getFieldCount(collection.name) }} fields
            </UBadge>
            <UBadge :color="collection.isSystem ? 'error' : 'neutral'" variant="soft" size="xs">
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
