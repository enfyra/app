<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { defineComponent, h } from "vue";
import CommonSystemVisibilityControl from "~/components/common/SystemVisibilityControl.vue";
import type { SystemVisibilityMode } from "~/types/ui";

const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const { getId } = useDatabase();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Collections",
  gradient: "purple",
});

const { isTablet } = useScreen();
const { schemas } = useSchema();

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
              onClick: () => (searchQuery.value = ""),
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
      fields: "*",
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

</script>

<template>
  <CommonCardListFrame
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
    <div
      :class="
        isTablet
          ? 'grid gap-4 grid-cols-2'
          : 'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      "
    >
      <div
        v-for="collection in displayedCollections"
        :key="collection.id"
        @click="navigateTo(`/collections/${collection.name}`)"
        class="relative rounded-2xl surface-card-hover cursor-pointer group overflow-hidden"
        :class="[isTablet ? 'p-5' : 'p-5 md:p-6', collectionsRefreshing ? 'pointer-events-none cursor-wait' : '']"
        :aria-busy="collectionsRefreshing"
      >
        <div
          :class="[
            'flex items-center justify-center w-12 h-12 rounded-xl mb-5',
            collection.isSystem
              ? 'accent-tile accent-tile-error'
              : 'accent-tile accent-tile-primary'
          ]"
        >
          <div v-if="collectionsRefreshing" class="h-1/2 w-1/2 rounded-[var(--radius-subcontrol)] skeleton-gradient skeleton-pulse-slow" />
          <UIcon
            v-else
            name="lucide:database"
            class="w-6 h-6 text-current"
          />
        </div>

        <div class="flex items-end justify-between">
          <div class="flex-1">
            <div v-if="collectionsRefreshing" class="mb-4 space-y-3">
              <div class="h-5 w-2/3 rounded skeleton-gradient skeleton-pulse-slow" />
              <div class="h-4 w-full rounded skeleton-inline skeleton-pulse-slow" />
              <div class="h-4 w-3/4 rounded skeleton-inline skeleton-pulse-slow" />
            </div>
            <h3 v-else class="text-lg font-semibold text-[var(--text-primary)] mb-1">
              {{ collection.name || "Untitled Collection" }}
            </h3>
            <p v-if="!collectionsRefreshing" class="text-sm text-[var(--text-tertiary)] mb-4 line-clamp-2">
              {{ collection.description || "No description" }}
            </p>

            <div class="flex items-center gap-4">
              <div>
                <p class="text-sm text-[var(--text-tertiary)]">Fields</p>
                <div v-if="collectionsRefreshing" class="mt-2 h-4 w-8 rounded skeleton-gradient skeleton-pulse-slow" />
                <p v-else class="mt-1 font-semibold text-[var(--text-primary)]">
                  {{ getFieldCount(collection.name) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-[var(--text-tertiary)]">Type</p>
                <div v-if="collectionsRefreshing" class="mt-2 h-5 w-16 rounded-full skeleton-gradient skeleton-pulse-slow" />
                <span
                  v-else
                  :class="[
                    'mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                    collection.isSystem
                      ? 'bg-[var(--badge-danger-soft-bg)] text-[var(--badge-danger-soft-text)] ring-[var(--badge-danger-soft-border)]'
                      : 'bg-[var(--badge-primary-soft-bg)] text-[var(--badge-primary-soft-text)] ring-[var(--badge-primary-soft-border)]'
                  ]"
                >
                  {{ collection.isSystem ? "System" : "Custom" }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </CommonCardListFrame>
</template>
