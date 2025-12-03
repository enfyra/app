<script setup lang="ts">
const toast = useToast();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const tableName = "bootstrap_script_definition";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { getId } = useDatabase();

const { isMounted } = useMounted();
const { isTablet } = useScreen();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Bootstrap Manager",
  gradient: "purple",
});

// Fixed color for initialization scripts
const pageIconColor = 'success';

const {
  data: apiData,
  pending: loading,
  execute: fetchBootstrapScripts,
} = useApi(() => "/bootstrap_script_definition", {
  query: computed(() => ({
    fields: getIncludeFields(),
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Bootstrap Scripts",
});

const { execute: removeScript, error: removeScriptError } = useApi(
  () => `/bootstrap_script_definition`,
  {
    method: "delete",
    errorContext: "Delete Script",
  }
);

const bootstrapScripts = computed(() => apiData.value?.data || []);
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry({
  id: "create-bootstrap",
  label: "Create Bootstrap",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/settings/bootstrap/create",
  permission: {
    and: [
      {
        route: "/bootstrap_script_definition",
        actions: ["create"],
      },
    ],
  },
});

async function deleteScript(id: number) {
  const ok = await confirm({
    title: "Are you sure?",
  });
  if (!ok) return;

  await removeScript({ id });

  if (removeScriptError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Bootstrap script deleted successfully", 
    color: "success" 
  });
  await fetchBootstrapScripts();
}

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchBootstrapScripts();
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading bootstrap scripts..."
        description="Fetching bootstrap scripts"
        size="sm"
        type="card"
        context="page"
      />

      <div
        v-else-if="bootstrapScripts.length"
        class="grid gap-4"
        :class="
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="script in bootstrapScripts"
          :key="script.id"
          :title="script.name"
          :description="script.description || 'No description'"
          icon="lucide:rocket"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
          @click="navigateTo(`/settings/bootstrap/${getId(script)}`)"
          :stats="[
            {
              label: 'Type',
              component: 'UBadge',
              props: { variant: 'soft', color: 'warning' },
              value: script.type || 'Unknown',
            },
            {
              label: 'System',
              component: script.isSystem ? 'UBadge' : undefined,
              props: script.isSystem ? { variant: 'soft', color: 'info' } : undefined,
              value: script.isSystem ? 'System' : '-'
            },
            {
              label: 'Created',
              value: new Date(script.createdAt).toLocaleDateString(),
            },
          ]"
          :actions="[
            {
              label: 'Delete',
              props: {
                icon: 'i-lucide-trash-2',
                variant: 'solid',
                color: 'error',
                size: 'sm',
              },
              disabled: script.isSystem,
              onClick: (e?: Event) => {
                e?.stopPropagation();
                deleteScript(getId(script));
              },
            }
          ]"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No bootstrap scripts found"
        description="No bootstrap scripts have been created yet"
        icon="lucide:rocket"
        size="sm"
      />
    </Transition>

    <!-- Premium Pagination -->
    <div
      v-if="!loading && bootstrapScripts.length > 0 && total > pageLimit"
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
        Showing <span class="text-gray-700 dark:text-gray-200">{{ (page - 1) * pageLimit + 1 }}-{{ Math.min(page * pageLimit, total) }}</span> of <span class="text-gray-700 dark:text-gray-200">{{ total }}</span> results
      </p>
    </div>
  </div>
</template>
