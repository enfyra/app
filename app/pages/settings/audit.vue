<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import type { ColumnDef } from '@tanstack/vue-table';
import type { CodeAuditRecord, CodeAuditResponse } from '~/types/code-audit';
import type { FeatureCollection } from '~/types/feature-api';
import { VERSIONED_CODE_TABLES, nextCodeVersion, normalizeCodeVersion } from '~/utils/code-version';
import { settingsDateColumn, settingsTextColumn } from '~/utils/settings-table';
import { formatDate } from '~/utils/common/filter/filter-helpers';

const route = useRoute();
const router = useRouter();
const { getId, createIdFilter, getIdFieldName } = useDatabase();
const { checkPermissionCondition } = usePermissions();
const { confirm } = useCodeVersion();
const notify = useNotify();
const tableName = computed(() => VERSIONED_CODE_TABLES.some(table => table === route.query.table) ? String(route.query.table) : '');
const recordId = ref(String(route.query.recordId || ''));
const limit = useSettingsPageSize('audit');
const selected = ref<CodeAuditRecord | null>(null);
const detailsOpen = ref(false);
const restoring = ref(false);
const { registerPageHeader } = usePageHeaderRegistry();
registerPageHeader({ title: 'Audit', description: 'Review earlier code revisions and restore one as a new version.' });
const { executeWithResult: readHistory, cancel } = useApi<CodeAuditResponse>('/enfyra_audit', { disableErrorPage: true, errorContext: 'Load audit history' });
const { executeWithResult: readEntry } = useApi<CodeAuditResponse>('/enfyra_audit', { disableErrorPage: true, errorContext: 'Read code revision' });
const { executeWithResult: restore } = useApi('/admin/code-audit/revert', { method: 'post', disableErrorPage: true, errorContext: 'Restore code revision' });
const { executeWithResult: readCurrent } = useApi<FeatureCollection<{ version?: unknown }>>(() => `/${selected.value?.tableName}`, { disableErrorPage: true, errorContext: 'Read current version' });
const canRead = computed(() => checkPermissionCondition({ and: [{ route: '/enfyra_audit', methods: ['GET'] }] }));
const canRestore = computed(() => !!selected.value && ['update', 'revert'].includes(selected.value.action) && !!selected.value.previous && checkPermissionCondition({ and: [{ route: '/admin/code-audit/revert', methods: ['POST'] }, { route: `/${selected.value.tableName}`, methods: ['PATCH'] }] }));
const source = computed(() => String(selected.value?.previous?.[selected.value?.tableName === 'enfyra_extension' ? 'code' : 'sourceCode'] ?? ''));
const sourceField = computed(() => selected.value?.tableName === 'enfyra_extension' ? 'code' : 'sourceCode');
const language = computed(() => selected.value?.tableName === 'enfyra_extension' ? 'vue' : selected.value?.previous?.scriptLanguage === 'javascript' ? 'javascript' : 'typescript');
const actionLabels: Record<string, string> = { create: 'Created', update: 'Updated', delete: 'Deleted', revert: 'Restored' };
const revisionTitle = computed(() => selected.value ? `${actionLabels[selected.value.action] ?? selected.value.action} · ${selected.value.tableName}` : 'Code revision');
const revisionDescription = computed(() => selected.value ? `${selected.value.recordId} · ${selected.value.fromVersion || 'no earlier version'} → ${selected.value.toVersion || 'deleted'}` : '');
const revisionFacts = computed(() => {
  const entry = selected.value;
  if (!entry) return [];
  return [
    { label: 'Action', value: actionLabels[entry.action] ?? entry.action },
    { label: 'Record ID', value: entry.recordId },
    { label: 'Version', value: `${entry.fromVersion || '—'} → ${entry.toVersion || 'deleted'}` },
    ...(entry.restoredFrom ? [{ label: 'Restored from', value: entry.restoredFrom }] : []),
    { label: 'Changed by', value: entry.changedByEmail || 'Unknown caller' },
    { label: 'Credential', value: entry.changedBySource ? entry.changedBySource.toUpperCase() : '—' },
    { label: 'When', value: formatDate(entry.createdAt, true) || '—' },
  ];
});
const previousFields = computed(() => {
  const previous = selected.value?.previous;
  if (!previous || typeof previous !== 'object') return [];
  return Object.entries(previous)
    .filter(([key]) => !['id', '_id', 'createdAt', 'updatedAt', 'version', 'config', sourceField.value].includes(key))
    .map(([key, value]) => ({
      key,
      value: value === null || value === undefined ? '_' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
      multiline: typeof value === 'object' && value !== null,
    }));
});
const columns: ColumnDef<CodeAuditRecord>[] = [settingsTextColumn('tableName', 'Table'), settingsTextColumn('recordId', 'Record'), settingsTextColumn('action', 'Action'), settingsTextColumn('fromVersion', 'From'), settingsTextColumn('toVersion', 'To'), settingsTextColumn('changedByEmail', 'Changed by'), settingsTextColumn('changedBySource', 'Credential'), settingsDateColumn()];
const tableLabel = computed(() => tableName.value || 'All');
const tableMenuItems = computed<DropdownMenuItem[]>(() => [
  { label: 'All', type: 'checkbox' as const, checked: !tableName.value, onUpdateChecked: () => changeTable('') },
  ...VERSIONED_CODE_TABLES.map(table => ({
    label: table,
    type: 'checkbox' as const,
    checked: tableName.value === table,
    onUpdateChecked: () => changeTable(table),
  })),
]);
const listFields = 'id,tableName,recordId,action,fromVersion,toVersion,restoredFrom,changedByEmail,changedBySource,createdAt';
const total = ref<number | undefined>(undefined);
let inspectionGeneration = 0;
let active = true;

const {
  page,
  data: rows,
  hasNextPage,
  loading,
  setPage,
  reset: reload,
} = useCursorPagination<CodeAuditRecord, string | number>({
  itemsPerPage: limit,
  scope: () => `${tableName.value}|${recordId.value}`,
  getCursor: row => getId(row),
  async fetchPage(cursor, pageLimit) {
    if (!canRead.value) return null;
    const filter: Record<string, unknown> = {};
    if (tableName.value) filter.tableName = { _eq: tableName.value };
    if (recordId.value) filter.recordId = { _eq: recordId.value };
    if (cursor !== null) filter[getIdFieldName()] = { _lt: cursor };
    const countsPopulation = cursor === null;
    const result = await readHistory({ query: { fields: listFields, filter: Object.keys(filter).length ? filter : undefined, sort: '-id', limit: pageLimit, ...(countsPopulation ? { meta: 'filterCount' } : {}) } });
    if (!result.ok) return null;
    if (countsPopulation) total.value = result.data.meta?.filterCount;
    return result.data.data;
  },
});

const bulkDelete = useSettingsBulkDelete<CodeAuditRecord>({
  path: '/enfyra_audit',
  title: 'Delete audit entries',
  warning: 'Deleted revisions can no longer be reviewed or restored.',
  isEligible: row => getId(row) !== null && getId(row) !== undefined,
  isBusy: () => restoring.value,
  refresh: () => reload(),
  onDeleted: async (deleted) => {
    if (selected.value && deleted.some(entry => String(getId(entry)) === String(getId(selected.value)))) {
      detailsOpen.value = false;
      selected.value = null;
    }
  },
});

async function applyFilter() {
  recordId.value = recordId.value.trim();
  if (recordId.value === String(route.query.recordId || '')) {
    await reload();
    return;
  }
  await router.push({ path: route.path, query: { ...route.query, table: tableName.value || undefined, recordId: recordId.value || undefined } });
}
async function changeTable(value: string) {
  await router.push({ path: route.path, query: { ...route.query, table: value || undefined } });
}
async function inspect(row: CodeAuditRecord) {
  if (!canRead.value || restoring.value) return;
  const token = ++inspectionGeneration;
  const result = await readEntry({ query: { fields: `${listFields},previous`, filter: createIdFilter(getId(row)), limit: 1 } });
  if (!active || token !== inspectionGeneration || !result.ok || !result.data.data[0]) return;
  selected.value = result.data.data[0];
  detailsOpen.value = true;
}
async function revert() {
  const entry = selected.value;
  if (!entry || !canRestore.value || restoring.value) return;
  restoring.value = true;
  try {
    const current = await readCurrent({ query: { fields: 'version', filter: createIdFilter(entry.recordId), limit: 1 } });
    if (!current.ok || !active) return;
    const currentVersion = normalizeCodeVersion(current.data.data[0]?.version);
    const version = await confirm({ tableName: entry.tableName, recordId: entry.recordId, currentVersion, suggestedVersion: nextCodeVersion(currentVersion) });
    if (!version || !active) return;
    const result = await restore({ body: { auditId: getId(entry), version } });
    if (!result.ok || !active) return;
    detailsOpen.value = false;
    notify.success('Code restored', `Saved as version ${version}.`);
    await reload();
  } catch (error) {
    notify.error('Restore failed', error instanceof Error ? error.message : 'Cannot restore this revision.');
  } finally { restoring.value = false; }
}
watch(() => [tableName.value, route.query.recordId], () => { recordId.value = String(route.query.recordId || ''); });
watch(() => [tableName.value, route.query.recordId, limit.value, canRead.value], () => { void reload(); }, { immediate: true });
onBeforeUnmount(() => { active = false; inspectionGeneration++; cancel(); });
</script>

<template>
  <div class="space-y-4 min-w-0">
    <CommonEmptyState v-if="!canRead" title="Access denied" description="Audit requires read permission for enfyra_audit." icon="lucide:lock" />
    <template v-else>
      <DataTableSettingsTable
        v-model:search="recordId"
        :page="page"
        header-name="Audit"
        searchable
        search-label="Exact record ID"
        search-placeholder="Search by exact record ID"
        :data="rows"
        :columns="columns"
        :loading="loading"
        v-bind="total === undefined ? {} : { total }"
        :reload="reload"
        :reload-loading="loading"
        :page-limit="limit"
        page-size-key="audit"
        pagination-mode="cursor"
        :has-next-page="hasNextPage"
        :bulk-action="bulkDelete"
        @update:page="setPage"
        @search="applyFilter"
        @page-size-change="value => { limit = value; }"
        @row-click="inspect"
      >
        <template #toolbar-actions>
          <UDropdownMenu :items="tableMenuItems" :content="{ align: 'end' }" :ui="{ item: 'cursor-pointer pointer-coarse:min-h-[44px]' }">
            <UButton color="neutral" variant="outline" size="sm" aria-label="Code table" :title="tableLabel" class="max-w-28 md:max-w-52">
              <span class="truncate">{{ tableLabel }}</span>
              <UIcon name="lucide:chevron-down" class="size-3.5 shrink-0 opacity-60" />
            </UButton>
          </UDropdownMenu>
        </template>
      </DataTableSettingsTable>
      <CommonDrawer v-model="detailsOpen" :cancel-action="{ label: 'Close', onClick: () => { detailsOpen = false; } }" :primary-action="canRestore ? { label: 'Restore as new version', loading: restoring, onClick: revert } : false">
        <template #header>
          <div class="min-w-0 pr-2">
            <h2 class="truncate text-base font-semibold text-highlighted" :title="revisionTitle">{{ revisionTitle }}</h2>
            <p class="mt-0.5 truncate text-xs text-muted">{{ revisionDescription }}</p>
          </div>
        </template>
        <template #body>
          <div v-if="selected" class="min-w-0 space-y-6">
            <UAlert v-if="selected.action === 'delete'" title="Deleted records cannot be restored" description="This entry is retained as history only." color="warning" variant="soft" />
            <dl class="divide-y divide-[var(--border-subtle)] text-sm">
              <div v-for="fact in revisionFacts" :key="fact.label" class="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-2.5">
                <dt class="eapp-text-tertiary">{{ fact.label }}</dt>
                <dd class="min-w-0 break-words eapp-text-primary">{{ fact.value }}</dd>
              </div>
            </dl>
            <section class="space-y-2">
              <h3 class="text-sm font-semibold text-highlighted">Source before this change</h3>
              <FormCodeEditorLazy v-if="source" :model-value="source" :readonly="true" :language="language" height="220px" />
              <p v-else class="text-sm text-muted">This entry has no earlier source.</p>
            </section>
            <section v-if="previousFields.length" class="space-y-2">
              <h3 class="text-sm font-semibold text-highlighted">Other values at this revision</h3>
              <dl class="divide-y divide-[var(--border-subtle)] text-sm">
                <div v-for="field in previousFields" :key="field.key" class="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-2.5">
                  <dt class="truncate font-mono text-xs eapp-text-tertiary" :title="field.key">{{ field.key }}</dt>
                  <dd class="min-w-0 break-words eapp-text-primary">
                    <pre v-if="field.multiline" class="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{{ field.value }}</pre>
                    <span v-else>{{ field.value }}</span>
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </template>
      </CommonDrawer>
    </template>
  </div>
</template>
