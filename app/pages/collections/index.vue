<script setup lang="ts">
import { defineComponent, h } from "vue";

const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const { getId } = useDatabase();

const { isMounted } = useMounted();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Collections",
  gradient: "purple",
});

const { isTablet } = useScreen();
const { schemas } = useSchema();

const searchQuery = ref("");
const showSystem = ref(route.query.system === 'true');
const router = useRouter();

watch(() => route.query.system, (v) => {
  const next = v === 'true';
  if (showSystem.value !== next) {
    showSystem.value = next;
  }
});

watch(showSystem, (v) => {
  if ((route.query.system === 'true') !== v) {
    const query = { ...route.query }
    if (v) query.system = 'true'
    else delete query.system
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

useSubHeaderActionRegistry([
  {
    id: "toggle-system-collections",
    icon: "lucide:shield",
    get label() {
      return showSystem.value ? "Hide System" : "Show System";
    },
    get variant() {
      return showSystem.value ? "solid" as const : "outline" as const;
    },
    get color() {
      return showSystem.value ? "warning" as const : "neutral" as const;
    },
    size: "md",
    side: "right",
    order: 0,
    onClick: () => {
      showSystem.value = !showSystem.value;
      page.value = 1;
    },
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
} = useApi(() => "/table_definition", {
  query: computed(() => {
    const conditions: any[] = [];
    if (!showSystem.value) {
      conditions.push({ isSystem: { _eq: false } });
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

const collections = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.filterCount ?? 0);
const showInitialLoading = computed(() => !isMounted.value || (loading.value && !apiData.value));

useHeaderActionRegistry({
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
        route: "/table_definition",
        actions: ["create"],
      },
    ],
  },
});

watch(
  () => [route.query.page, route.query.system],
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

const gradients = [
  "from-blue-500 to-cyan-500", 
  "from-purple-500 to-fuchsia-500", 
  "from-cyan-500 to-teal-500", 
  "from-orange-500 to-pink-500", 
  "from-violet-500 to-fuchsia-500", 
  "from-cyan-500 to-blue-500", 
];

function getGradientForCollection(id: any): string | undefined {
  
  const idStr = String(id);
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="showInitialLoading"
        title="Loading collections..."
        description="Fetching table collections"
        size="sm"
        type="card"
        context="page"
      />
      <div v-else-if="collections.length">
        <CommonAnimatedGrid
          :grid-class="
            isTablet
              ? 'grid gap-4 grid-cols-2'
              : 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          "
        >
          <div
            v-for="collection in collections"
            :key="collection.id"
            @click="navigateTo(`/collections/${collection.name}`)"
            class="relative rounded-2xl surface-card-hover cursor-pointer group overflow-hidden"
            :class="isTablet ? 'p-5' : 'p-5 md:p-6'"
          >
            <div
              :class="[
                'flex items-center justify-center w-12 h-12 rounded-xl mb-5',
                collection.isSystem 
                  ? 'bg-error-100 dark:bg-error-500/20' 
                  : `bg-gradient-to-br ${getGradientForCollection(getId(collection))}`
              ]"
            >
              <UIcon 
                name="lucide:database" 
                :class="[
                  'w-6 h-6',
                  collection.isSystem 
                    ? 'text-error-600 dark:text-error-400' 
                    : 'text-white'
                ]" 
              />
            </div>

            <div class="flex items-end justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-1">
                  {{ collection.name || "Untitled Collection" }}
                </h3>
                <p class="text-sm text-[var(--text-tertiary)] mb-4 line-clamp-2">
                  {{ collection.description || "No description" }}
                </p>

                <div class="flex items-center gap-4">
                    <div>
                    <p class="text-sm text-[var(--text-tertiary)]">Fields</p>
                    <p class="mt-1 font-semibold text-[var(--text-primary)]">
                        {{ getFieldCount(collection.name) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--text-tertiary)]">Type</p>
                    <span
                      :class="[
                        'mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          collection.isSystem
                          ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
                          : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-500'
                      ]"
                    >
                        {{ collection.isSystem ? "System" : "Custom" }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CommonAnimatedGrid>
        <CommonPaginationBar
          v-if="collections.length > 0 && total > pageLimit"
          v-model:page="page"
          class="mt-6"
          :items-per-page="pageLimit"
          :total="total"
          :loading="loading"
          :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
          :ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
        />
      </div>

      <CommonEmptyState
        v-else
        :title="searchQuery ? 'No results found' : 'No collections found'"
        :description="searchQuery ? 'No tables found matching your search' : 'No table collections have been created yet'"
        icon="lucide:database"
        size="sm"
      />
    </Transition>
  </div>
</template>
