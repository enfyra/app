<script setup lang="ts">
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

const {
  data: apiData,
  pending: loading,
  execute: fetchCollections,
} = useApi(() => "/table_definition", {
  query: computed(() => ({
    fields: "*",
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Collections",
});

const collections = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

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
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchCollections();
  },
  { immediate: true }
);

function getFieldCount(collectionName: string): number {
  const schema = schemas.value[collectionName];
  if (!schema?.definition) return 0;
  // Exclude default fields: createdAt and updatedAt
  return schema.definition.filter(
    (field: any) => field.name !== 'createdAt' && field.name !== 'updatedAt'
  ).length;
}

// List of gradient colors for random assignment
const gradients = [
  "from-blue-500 to-cyan-500", // blue to cyan
  "from-purple-500 to-fuchsia-500", // purple to fuchsia
  "from-cyan-500 to-teal-500", // cyan to teal
  "from-orange-500 to-pink-500", // orange to pink
  "from-violet-500 to-fuchsia-500", // violet to fuchsia
  "from-cyan-500 to-blue-500", // cyan to blue
];

function getGradientForCollection(id: any): string | undefined {
  // Use ID to consistently assign same gradient to same collection
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
        v-if="!isMounted || loading"
        title="Loading collections..."
        description="Fetching table collections"
        size="sm"
        type="card"
        context="page"
      />
      <div v-else-if="collections.length">
        <div
          class="grid gap-4"
          :class="
            isTablet
              ? 'grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          "
        >
          <div
            v-for="collection in collections"
            :key="collection.id"
            @click="navigateTo(`/collections/${collection.name}`)"
            class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] cursor-pointer group transition-all duration-300 hover:shadow-theme-md"
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
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                  {{ collection.name || "Untitled Collection" }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                  {{ collection.description || "No description" }}
                </p>
                
                <div class="flex items-center gap-4">
                  <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Fields</p>
                    <p class="mt-1 font-semibold text-gray-800 dark:text-white/90">
                      {{ getFieldCount(collection.name) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Type</p>
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
        </div>
        <div
          v-if="!loading && collections.length > 0 && total > pageLimit"
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
            :ui="{
              item: 'h-9 w-9 rounded-xl transition-all duration-300',
            }"
          />
          <p class="hidden md:block text-sm text-gray-400">
            Showing
            <span class="text-gray-200"
              >{{ (page - 1) * pageLimit + 1 }}-{{
                Math.min(page * pageLimit, total)
              }}</span
            >
            of <span class="text-gray-200">{{ total }}</span> results
          </p>
        </div>
      </div>

      <CommonEmptyState
        v-else
        title="No collections found"
        description="No table collections have been created yet"
        icon="lucide:database"
        size="sm"
      />
    </Transition>
  </div>
</template>
