<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const tableName = "enfyra_bootstrap_script";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { getId } = useDatabase();

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
    fields: getIncludeFields(),
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
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
        <template #skeleton-row>
          <CommonResourceListSkeletonRow
            title-width="w-44"
            description-width="w-1/2 max-w-[28rem]"
            :chips="['w-20', 'w-16', 'w-24']"
            trailing-width="w-20"
          />
        </template>

        <CommonResourceListItem
          v-for="script in bootstrapScripts"
          :key="script.id"
          :title="script.name"
          :description="script.description || 'No description'"
          icon="lucide:rocket"
          :icon-color="pageIconColor"
          :content-loading="bootstrapScriptsRefreshing"
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
        >
          <template #skeleton-content>
            <span class="block h-4 w-44 rounded skeleton-gradient skeleton-pulse-slow" />
            <span class="block h-3 w-1/2 max-w-[28rem] rounded skeleton-inline skeleton-pulse-slow" />
            <span class="flex flex-wrap gap-2">
              <span class="block h-5 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
              <span class="block h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
              <span class="hidden h-5 w-24 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
            </span>
          </template>
          <template #skeleton-actions>
            <span class="hidden h-8 w-20 flex-shrink-0 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block" />
          </template>
        </CommonResourceListItem>
  </CommonResourceListFrame>
</template>
