<script setup lang="ts">
const toast = useToast();
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
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

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
  return schema.definition.length;
}

// List of gradient colors for random assignment
const gradients = [
  "from-[#0066FF] to-[#06B6D4]", // blue to cyan
  "from-[#7C3AED] to-[#D946EF]", // purple to fuchsia
  "from-[#06B6D4] to-[#14B8A6]", // cyan to teal
  "from-[#F97316] to-[#EC4899]", // orange to pink
  "from-[#8B5CF6] to-[#D946EF]", // purple to fuchsia
  "from-[#06B6D4] to-[#0066FF]", // cyan to blue
];

function getGradientForCollection(id: any): string | undefined {
  // Use ID to consistently assign same gradient to same collection
  const idStr = String(id);
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
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

      <div
        v-else-if="collections.length"
        class="grid gap-5"
        :class="
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        "
      >
        <div
          v-for="collection in collections"
          :key="collection.id"
          @click="navigateTo(`/collections/${collection.name}`)"
          class="p-6 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-elevated)] cursor-pointer group relative overflow-hidden transition-all duration-300 flex flex-col"
          style="box-shadow: var(--shadow-lg)"
        >
          <!-- Gradient glow on hover -->
          <div
            :class="`absolute inset-0 bg-gradient-to-br ${getGradientForCollection(getId(collection))} opacity-0 group-hover:opacity-5 transition-opacity duration-300`"
          ></div>
          <div
            :class="`absolute inset-0 bg-gradient-to-br ${getGradientForCollection(getId(collection))} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300`"
          ></div>

          <div class="relative flex flex-col flex-1">
            <!-- Content wrapper -->
            <div class="flex-1">
            <!-- Header with Icon -->
            <div class="flex items-start justify-between mb-4">
              <div
                :class="`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getGradientForCollection(getId(collection))} shadow-lg transition-transform duration-300 group-hover:scale-110`"
              >
                <UIcon name="lucide:database" class="w-7 h-7 text-white" />
              </div>
            </div>

            <!-- Title & Description -->
            <h3
              class="text-xl font-semibold mb-2 tracking-tight transition-all duration-300"
              style="color: var(--text-primary)"
            >
              {{ collection.name || "Untitled Collection" }}
            </h3>
            <p
              class="text-sm mb-4 truncate"
              style="color: var(--text-tertiary)"
            >
              {{ collection.description || "No description" }}
            </p>

            <!-- Stats -->
            <div class="flex items-center gap-4 mb-4">
              <!-- Fields Count -->
              <div class="flex items-center gap-2">
                <div
                  :class="`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradientForCollection(getId(collection))} opacity-20 flex items-center justify-center`"
                >
                  <UIcon
                    name="lucide:layers"
                    class="w-4 h-4"
                    style="color: var(--text-primary)"
                  />
                </div>
                <div>
                  <div class="text-sm font-medium" style="color: var(--text-primary)">
                    {{ getFieldCount(collection.name) }}
                  </div>
                  <div class="text-xs" style="color: var(--text-quaternary)">
                    fields
                  </div>
                </div>
              </div>

              <!-- System/Custom Badge -->
              <div class="flex items-center gap-2">
                <div
                  :class="`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradientForCollection(getId(collection))} opacity-20 flex items-center justify-center`"
                >
                  <UIcon
                    :name="collection.isSystem ? 'lucide:shield-check' : 'lucide:box'"
                    class="w-4 h-4"
                    style="color: var(--text-primary)"
                  />
                </div>
                <div>
                  <div class="text-sm font-medium" style="color: var(--text-primary)">
                    {{ collection.isSystem ? "System" : "Custom" }}
                  </div>
                  <div class="text-xs" style="color: var(--text-quaternary)">
                    type
                  </div>
                </div>
              </div>
            </div>
            </div>

            <!-- Footer -->
            <div
              class="flex items-center justify-between pt-4 border-t mt-auto"
              style="border-color: var(--border-subtle)"
            >
              <span class="text-xs" style="color: var(--text-quaternary)">
                {{ new Date(collection.createdAt).toLocaleDateString() }}
              </span>
              <UIcon
                name="lucide:arrow-right"
                class="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-300"
                style="color: var(--text-tertiary)"
              />
            </div>
          </div>
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

    <!-- Premium Pagination -->
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
        Showing <span class="text-gray-200">{{ (page - 1) * pageLimit + 1 }}-{{ Math.min(page * pageLimit, total) }}</span> of <span class="text-gray-200">{{ total }}</span> results
      </p>
    </div>
  </div>
</template>
