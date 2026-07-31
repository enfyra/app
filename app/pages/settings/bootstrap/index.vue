<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();
const page = ref(1);
const pageLimit = 10;
const route = useRoute();
const tableName = "enfyra_bootstrap_script";
const { confirm } = useConfirm();
const { getId } = useDatabase();
const BOOTSTRAP_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "type",
  "isSystem",
  "createdAt",
].join(",");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Bootstrap Manager",
  gradient: "purple",
});

const pageIconColor = 'primary';

const {
  data: apiData,
  pending: loading,
  execute: fetchBootstrapScripts,
} = useApi(() => "/enfyra_bootstrap_script", {
  query: computed(() => ({
    fields: BOOTSTRAP_LIST_FIELDS,
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Bootstrap Scripts",
});

const { execute: removeScript, error: removeScriptError } = useApi(
  () => `/enfyra_bootstrap_script`,
  {
    method: "delete",
    errorContext: "Delete Script",
  }
);

const {
  items: bootstrapScripts,
  showInitialLoading,
  isRefreshing: bootstrapScriptsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

registerHeaderActions({
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
        route: "/enfyra_bootstrap_script",
        methods: ["POST"],
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

  notify.success("Success", "Bootstrap script deleted successfully");
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
  <CommonResourceListFrame
    v-model:page="page"
    :loading="showInitialLoading"
    :has-items="bootstrapScripts.length > 0"
    loading-title="Loading bootstrap scripts..."
    loading-description="Fetching bootstrap scripts"
    empty-title="No bootstrap scripts found"
    empty-description="No bootstrap scripts have been created yet"
    empty-icon="lucide:rocket"
    :total="total"
    :items-per-page="pageLimit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
  >
        <CommonResourceListItem
          v-for="script in bootstrapScripts"
          :key="script.id"
          :title="script.name"
          :description="script.description || 'No description'"
          icon="lucide:rocket"
          :icon-color="pageIconColor"
          :loading="bootstrapScriptsRefreshing"
          :to="`/settings/bootstrap/${getId(script)}`"
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
          :methods="[
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
  </CommonResourceListFrame>
</template>
