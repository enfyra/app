<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { settingsDateColumn, settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import type { SharedHelperListResponse, SharedHelperRecord } from '~/types/shared-helper';

const route = useRoute();
const router = useRouter();
const { getId } = useDatabase();
const { checkPermissionCondition } = usePermissions();
const { confirm } = useConfirm();
const notify = useNotify();
const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(Math.max(1, Number(route.query.page) || 1));
const limit = useSettingsPageSize('helpers');
const { searchQuery: search, searchFilter, submitSearch: searchHelpers } = useSettingsQuickSearch('name', () => loadHelpers());
const scope = computed(() => ['enabled', 'disabled'].includes(String(route.query.status)) ? String(route.query.status) : 'all');
const rows = ref<SharedHelperRecord[]>([]);
const total = ref(0);
const loading = ref(false);
const loadFailed = ref(false);
const mutatingId = ref<string | null>(null);
let active = true;
let generation = 0;
const canUpdate = computed(() => checkPermissionCondition({ and: [{ route: '/enfyra_helper', methods: ['PATCH'] }] }));
const canDelete = computed(() => checkPermissionCondition({ and: [{ route: '/enfyra_helper', methods: ['DELETE'] }] }));
const { executeWithResult: fetchHelpers, cancel } = useApi<SharedHelperListResponse>('/enfyra_helper', { immediate: false, errorContext: 'Load Helpers' });
const { executeWithResult: updateHelper } = useApi('/enfyra_helper', { method: 'patch', errorContext: 'Update Helper' });
const { executeWithResult: removeHelper } = useApi('/enfyra_helper', { method: 'delete', errorContext: 'Delete Helper' });
const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Helper'),
  settingsTextColumn('description', 'Description'),
  settingsTextColumn('scriptLanguage', 'Language'),
  settingsStatusColumn(),
  settingsDateColumn('updatedAt', 'Updated'),
];
registerHeaderActions([
  { id: 'helpers-refresh', label: 'Refresh', icon: 'lucide:refresh-cw', variant: 'outline', color: 'neutral', onClick: () => loadHelpers(), loading, disabled: computed(() => !!mutatingId.value) },
  { id: 'helpers-create', label: 'Create Helper', icon: 'lucide:plus', variant: 'solid', color: 'primary', to: '/settings/helpers/create', permission: { and: [{ route: '/enfyra_helper', methods: ['POST'] }] }, order: 999 },
]);

async function loadHelpers(requestedPage = page.value) {
  const token = ++generation;
  loading.value = true;
  loadFailed.value = false;
  const clauses: Record<string, unknown>[] = [];
  if (searchFilter.value) clauses.push(searchFilter.value);
  if (scope.value !== 'all') clauses.push({ isEnabled: { _eq: scope.value === 'enabled' } });
  try {
    const result = await fetchHelpers({ query: { fields: 'id,name,description,isEnabled,scriptLanguage,updatedAt', page: requestedPage, limit: limit.value, sort: 'name,id', meta: 'filterCount', ...(clauses.length ? { filter: { _and: clauses } } : {}) } });
    if (!active || token !== generation) return;
    if (!result.ok) { loadFailed.value = !result.aborted; return; }
    const count = result.data.meta?.filterCount ?? result.data.data.length;
    const lastPage = Math.max(1, Math.ceil(count / limit.value));
    if (requestedPage > lastPage) {
      await router.replace({ path: route.path, query: { ...route.query, page: lastPage === 1 ? undefined : lastPage } });
      return;
    }
    rows.value = result.data.data;
    total.value = count;
    page.value = requestedPage;
  } finally { if (active && token === generation) loading.value = false; }
}

async function setScope(value: unknown) {
  await router.push({ path: route.path, query: { ...route.query, status: value === 'all' ? undefined : String(value), page: undefined } });
}
async function changePage(value: number) {
  await router.push({ path: route.path, query: { ...route.query, page: value === 1 ? undefined : value } });
}
async function changePageSize(value: number) {
  limit.value = value;
  if (route.query.page) await router.replace({ path: route.path, query: { ...route.query, page: undefined } });
}
const bulkDelete = useSettingsBulkDelete({
  path: '/enfyra_helper',
  title: 'Delete Helpers',
  warning: 'Scripts calling these helpers will fail. This action cannot be undone.',
  isBusy: () => !active || mutatingId.value !== null,
  refresh: () => loadHelpers(),
});

function actions(helper: Record<string, any>): DataTableRowAction[] {
  return [
    ...(canUpdate.value ? [{ label: helper.isEnabled ? 'Disable' : 'Enable', icon: helper.isEnabled ? 'lucide:power-off' : 'lucide:power', disabled: !!mutatingId.value || bulkDelete.value.pending, onSelect: () => mutate(helper, false) }] : []),
    ...(canDelete.value ? [{ label: 'Delete', icon: 'lucide:trash-2', color: 'error' as const, disabled: !!mutatingId.value || bulkDelete.value.pending, onSelect: () => mutate(helper, true) }] : []),
  ];
}
async function mutate(helper: SharedHelperRecord, deleting: boolean) {
  const id = getId(helper);
  if (mutatingId.value || bulkDelete.value.pending || id == null || (deleting ? !canDelete.value : !canUpdate.value)) return;
  mutatingId.value = String(id);
  try {
    if (deleting && !await confirm({ title: 'Delete helper?', content: `Delete "${helper.name}"? Scripts calling this name will fail. This action cannot be undone.`, confirmText: 'Delete', cancelText: 'Cancel' })) return;
    if (!active) return;
    const result = deleting ? await removeHelper({ id }) : await updateHelper({ id, body: { isEnabled: !helper.isEnabled } });
    if (!result.ok || !active) return;
    notify.success(deleting ? 'Helper deleted' : helper.isEnabled ? 'Helper disabled' : 'Helper enabled');
    await loadHelpers();
  } finally { if (active) mutatingId.value = null; }
}
watch(() => [route.query.page, route.query.search, route.query.status, limit.value], (current, previous) => {
  if (!previous || current.slice(1).some((value, index) => value !== previous[index + 1])) {
    rows.value = [];
    total.value = 0;
  }
  void loadHelpers(Math.max(1, Number(route.query.page) || 1));
}, { immediate: true });
onBeforeUnmount(() => { active = false; generation++; cancel(); });
</script>

<template>
  <div class="min-w-0 space-y-4">
    <UAlert v-if="loadFailed" color="error" variant="soft" title="Helpers could not be loaded" description="Check your access or refresh to try again." />
  <DataTableSettingsTable
      header-name="Helpers"
      header-description="Write reusable code once and call it by name from handlers, hooks and flows." :bulk-action="bulkDelete" :page="page" :data="rows" :columns="columns" :actions="actions" :loading="loading" :pagination-loading="loading" :total="total" :page-limit="limit" page-size-key="helpers" :to="p => ({ path: route.path, query: { ...route.query, page: p } })" @update:page="changePage" @page-size-change="changePageSize" @row-click="helper => navigateTo(`/settings/helpers/${encodeURIComponent(String(getId(helper)))}`)" searchable v-model:search="search" search-placeholder="Search by name" search-label="Search helpers by name" @search="searchHelpers">
      <template #toolbar-actions>
        <USelect :model-value="scope" :items="[{ label: 'All statuses', value: 'all' }, { label: 'Enabled', value: 'enabled' }, { label: 'Disabled', value: 'disabled' }]" size="sm" aria-label="Helper status" class="w-36 shrink-0" @update:model-value="setScope" />
      </template>
      <template #empty>
        <CommonEmptyState title="No helpers found" description="Create a helper to share code across your scripts, or change the search filters." icon="lucide:code" variant="naked" />
      </template>
  </DataTableSettingsTable>
  </div>
</template>
