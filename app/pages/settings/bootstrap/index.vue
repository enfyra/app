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
    <!-- Header -->
    <CommonPageHeader
      title="Bootstrap Manager"
      title-size="md"
      show-background
      background-gradient="from-amber-500/8 via-orange-400/5 to-transparent"
      padding-y="py-6"
    />
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
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="script in bootstrapScripts"
          :key="script.id"
          :title="script.name"
          :description="script.description || 'No description'"
          icon="lucide:rocket"
          icon-color="warning"
          :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-warning/20 transition-all'"
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
          :actions="[]"
          :header-actions="!script.isSystem ? [{
            component: 'UButton',
            props: {
              icon: 'i-heroicons-trash',
              variant: 'outline',
              color: 'error'
            },
            onClick: (e?: Event) => {
              e?.stopPropagation();
              deleteScript(getId(script));
            }
          }] : []"
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

    <div
      class="flex justify-center"
      v-if="!loading && bootstrapScripts.length > 0"
    >
      <UPagination
        v-if="total > pageLimit"
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
        color="secondary"
        active-color="secondary"
      />
    </div>
  </div>
</template>
