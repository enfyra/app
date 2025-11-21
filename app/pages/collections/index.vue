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
            class="rounded-lg bg-[var(--bg-surface)] border border-white/[0.06] cursor-pointer group relative overflow-hidden transition-all duration-300 flex flex-col hover:shadow-md hover:-translate-y-0.5"
            :class="isTablet ? 'p-2' : 'p-3'"
          >
            <!-- Gradient glow on hover -->
            <div
              :class="`absolute inset-0 bg-gradient-to-br ${getGradientForCollection(
                getId(collection)
              )} opacity-0 group-hover:opacity-5 transition-opacity duration-300`"
            ></div>
            <div
              :class="`absolute inset-0 bg-gradient-to-br ${getGradientForCollection(
                getId(collection)
              )} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300`"
            ></div>

            <div class="relative flex flex-col flex-1">
              <!-- Content wrapper -->
              <div class="flex-1">
                <!-- Header with Icon -->
                <div class="flex items-start justify-between mb-2">
                  <div
                    :class="`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getGradientForCollection(
                      getId(collection)
                    )} shadow-lg transition-transform duration-300 group-hover:scale-110`"
                  >
                    <UIcon name="lucide:database" class="w-7 h-7 text-white" />
                  </div>
                </div>

                <!-- Title & Description -->
                <h3
                  class="text-xl font-semibold mb-1 tracking-tight transition-all duration-300 text-gray-100"
                >
                  {{ collection.name || "Untitled Collection" }}
                </h3>
                <p class="text-sm mb-2 truncate text-gray-400">
                  {{ collection.description || "No description" }}
                </p>

                <!-- Stats -->
                <div class="flex items-center gap-4 mb-2">
                  <!-- Fields Count -->
                  <div class="flex items-center gap-2">
                    <div
                      :class="`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradientForCollection(
                        getId(collection)
                      )} opacity-20 flex items-center justify-center`"
                    >
                      <UIcon
                        name="lucide:layers"
                        class="w-4 h-4 text-gray-100"
                      />
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-100">
                        {{ getFieldCount(collection.name) }}
                      </div>
                      <div class="text-xs text-gray-500">fields</div>
                    </div>
                  </div>

                  <!-- System/Custom Badge -->
                  <div class="flex items-center gap-2">
                    <div
                      :class="`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradientForCollection(
                        getId(collection)
                      )} opacity-20 flex items-center justify-center`"
                    >
                      <UIcon
                        :name="
                          collection.isSystem
                            ? 'lucide:shield-check'
                            : 'lucide:box'
                        "
                        class="w-4 h-4 text-gray-100"
                      />
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-100">
                        {{ collection.isSystem ? "System" : "Custom" }}
                      </div>
                      <div class="text-xs text-gray-500">type</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div
                class="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-auto"
              >
                <span class="text-xs text-gray-500">
                  {{ new Date(collection.createdAt).toLocaleDateString() }}
                </span>
                <UIcon
                  name="lucide:arrow-right"
                  class="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-300 text-gray-400"
                />
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
