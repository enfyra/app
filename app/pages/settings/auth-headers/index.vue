<template>
  <div class="eapp-page-constrained-wide w-full">
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm text-[var(--text-secondary)]">
            Headers are checked from highest priority to lowest priority. PAT mappings use Enfyra API-token verification.
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span class="inline-flex items-center gap-1.5">
            <span class="size-2 rounded-full bg-[var(--state-success-solid-bg)]" />
            {{ activeCount }} active
          </span>
          <span>{{ headers.length }} total</span>
        </div>
      </div>

      <DataTableSettingsTable
        :data="headers"
        :columns="columns"
        :actions="getRowActions"
        :loading="showInitialLoading"
        @row-click="header => canUpdate && openEdit(header as AuthHeaderRecord)"
      />
    </div>

    <CommonDrawer
      v-model="isOpen"
      direction="right"
      :cancel-action="{ label: 'Cancel', onClick: closeDrawer }"
      :primary-action="{
        label: mode === 'create' ? 'Create mapping' : 'Save changes',
        icon: 'lucide:save',
        loading: saving,
        disabled: !canSave,
        onClick: saveHeader,
      }"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-12 items-center justify-center rounded-xl bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)] ring-1 ring-inset ring-[var(--state-primary-outline-border)]">
            <UIcon name="lucide:key-round" class="size-6" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-[var(--text-primary)]">
              {{ mode === 'create' ? 'Add authentication header' : 'Edit authentication header' }}
            </h2>
            <p class="text-sm text-[var(--text-secondary)]">
              Map a request header to the native PAT or JWT verifier.
            </p>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-5">
          <section class="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-nested)] p-4">
            <div>
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">Header mapping</h3>
              <p class="mt-1 text-xs text-[var(--text-secondary)]">Header names are normalized to lowercase before matching. The same key may have PAT and JWT mappings; priority decides which verifier runs first.</p>
            </div>
            <UFormField label="Header key" :error="headerKeyError || undefined">
              <UInput
                v-model="form.headerKey"
                class="w-full font-mono"
                placeholder="x-api-key"
                :disabled="form.isSystem"
                @update:model-value="normalizeHeaderKey"
                @blur="headerKeyTouched = true"
              />
            </UFormField>
            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField label="Credential type">
                <USelect
                  v-model="form.credentialType"
                  :items="credentialOptions"
                  value-key="value"
                  class="w-full"
                  :disabled="form.isSystem"
                />
              </UFormField>
              <UFormField label="Header format">
                <USelect
                  v-model="form.scheme"
                  :items="schemeOptions"
                  value-key="value"
                  class="w-full"
                  :disabled="form.isSystem"
                />
              </UFormField>
            </div>
          </section>

          <section class="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-nested)] p-4">
            <div>
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">Resolution order</h3>
              <p class="mt-1 text-xs text-[var(--text-secondary)]">Lower values are checked first when a request contains multiple supported headers.</p>
            </div>
            <UFormField label="Priority">
              <UInput v-model.number="form.priority" type="number" min="0" step="1" class="w-full" />
            </UFormField>
            <UFormField label="Description">
              <UTextarea v-model="form.description" :rows="3" class="w-full" placeholder="Used by the AI gateway clients" />
            </UFormField>
            <div v-if="form.isSystem" class="rounded-lg border border-[var(--state-info-outline-border)] bg-[var(--state-info-soft-bg)] px-3 py-2 text-xs text-[var(--state-info-soft-text)]">
              System mappings cannot be disabled, deleted, or changed to another header/verifier.
            </div>
          </section>
        </div>
      </template>
    </CommonDrawer>

    <CommonUnsavedChangesModal
      v-model="showDiscardModal"
      content="You have unsaved changes to this authentication header. Are you sure you want to close? All changes will be lost."
      @discard="confirmDiscard"
    />
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { UBadge } from '#components';
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';

type AuthHeaderRecord = {
  id?: string | number;
  _id?: string | number;
  headerKey: string;
  credentialType: 'pat' | 'jwt';
  scheme: 'raw' | 'bearer';
  priority: number;
  isEnabled: boolean;
  isSystem: boolean;
  description?: string | null;
};

type AuthHeaderFormSnapshot = {
  id: string | number | null;
  headerKey: string;
  credentialType: 'pat' | 'jwt';
  scheme: 'raw' | 'bearer';
  priority: number;
  isEnabled: boolean;
  isSystem: boolean;
  description: string;
};

const HEADER_FIELDS = [
  'id',
  'headerKey',
  'credentialType',
  'scheme',
  'priority',
  'isEnabled',
  'isSystem',
  'description',
].join(',');

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const { confirm } = useConfirm();
const { getId } = useDatabase();
const { checkPermissionCondition } = usePermissions();
const { register: registerHeaderActions } = useHeaderActionRegistry();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: 'Authentication Headers',
  description: 'Choose which request headers authenticate through native Enfyra PAT or JWT verification.',
  gradient: 'purple',
});

const credentialOptions = [
  { label: 'PAT — Enfyra API token', value: 'pat' },
  { label: 'JWT — access token', value: 'jwt' },
];
const schemeOptions = [
  { label: 'Raw token', value: 'raw' },
  { label: 'Bearer token', value: 'bearer' },
];

const drawerOpen = ref(false);
const mode = ref<'create' | 'edit'>('create');
const saving = ref(false);
const moving = ref(false);
const togglingHeaderId = ref<string | number | null>(null);
const closingDrawer = ref(false);
const showDiscardModal = ref(false);
const headerKeyTouched = ref(false);
const validationAttempted = ref(false);
const initialForm = ref<AuthHeaderFormSnapshot | null>(null);
const form = reactive({
  id: null as string | number | null,
  headerKey: '',
  credentialType: 'pat' as 'pat' | 'jwt',
  scheme: 'raw' as 'raw' | 'bearer',
  priority: 0,
  isEnabled: true,
  isSystem: false,
  description: '',
});
const isOpen = computed({
  get: () => drawerOpen.value,
  set: (value: boolean) => {
    if (value) {
      drawerOpen.value = true;
      return;
    }
    void closeDrawer();
  },
});

const { data: apiData, pending: loading, execute: fetchHeaders } = useApi<{ data: AuthHeaderRecord[] }>(
  '/enfyra_auth_header',
  {
    query: {
      fields: HEADER_FIELDS,
      limit: 0,
      sort: 'priority,headerKey',
    },
    errorContext: 'Fetch Authentication Headers',
  },
);
const { items: headers, showInitialLoading } = useStableListState(
  () => apiData.value?.data,
  () => loading.value,
);

const { execute: createHeader } = useApi('/enfyra_auth_header', {
  method: 'post',
  errorContext: 'Create Authentication Header',
  disableErrorPage: true,
});
const { execute: updateHeader } = useApi('/enfyra_auth_header', {
  method: 'patch',
  errorContext: 'Update Authentication Header',
  disableErrorPage: true,
});
const { execute: deleteHeaderApi } = useApi('/enfyra_auth_header', {
  method: 'delete',
  errorContext: 'Delete Authentication Header',
  disableErrorPage: true,
});
const { execute: reorderHeadersApi } = useApi('/admin/auth-header/reorder', {
  method: 'post',
  errorContext: 'Reorder Authentication Headers',
  disableErrorPage: true,
});

const canCreate = computed(() => checkPermissionCondition({ or: [{ route: '/enfyra_auth_header', methods: ['POST'] }] }));
const canUpdate = computed(() => checkPermissionCondition({ or: [{ route: '/enfyra_auth_header', methods: ['PATCH'] }] }));
const canDelete = computed(() => checkPermissionCondition({ or: [{ route: '/enfyra_auth_header', methods: ['DELETE'] }] }));
const activeCount = computed(() => headers.value.filter((header) => header.isEnabled).length);
const headerKeyValidationError = computed(() => {
  const value = form.headerKey.trim();
  if (!value) return 'Enter a header key.';
  if (value !== value.toLowerCase()) return 'Use lowercase header names.';
  if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(value)) return 'Use a valid HTTP header name.';
  const duplicate = headers.value.some((header) => {
    const sameId = form.id != null && String(getId(header)) === String(form.id);
    return !sameId && header.headerKey === value && header.credentialType === form.credentialType && header.scheme === form.scheme;
  });
  return duplicate ? 'This header, verifier, and format already exist.' : null;
});
const headerKeyError = computed(() => (
  headerKeyTouched.value || validationAttempted.value
    ? headerKeyValidationError.value
    : null
));
const canSave = computed(() => Boolean(canUpdate.value || mode.value === 'create' && canCreate.value) && !saving.value && !headerKeyValidationError.value);
const hasUnsavedChanges = computed(() => {
  if (!initialForm.value) return false;
  return Object.keys(initialForm.value).some((key) => {
    const field = key as keyof AuthHeaderFormSnapshot;
    return form[field] !== initialForm.value?.[field];
  });
});

registerHeaderActions([
  {
    id: 'create-auth-header',
    label: 'Add header mapping',
    icon: 'lucide:plus',
    variant: 'solid',
    color: 'primary',
    size: 'md',
    onClick: openCreate,
    disabled: computed(() => !canCreate.value),
  },
]);

function normalizeHeaderKey(value: string) {
  form.headerKey = value.trim().toLowerCase();
}

function snapshotForm() {
  initialForm.value = {
    id: form.id,
    headerKey: form.headerKey,
    credentialType: form.credentialType,
    scheme: form.scheme,
    priority: form.priority,
    isEnabled: form.isEnabled,
    isSystem: form.isSystem,
    description: form.description,
  };
}

function resetForm() {
  form.id = null;
  form.headerKey = '';
  form.credentialType = 'pat';
  form.scheme = 'raw';
  form.priority = headers.value.length;
  form.isEnabled = true;
  form.isSystem = false;
  form.description = '';
  headerKeyTouched.value = false;
  validationAttempted.value = false;
}

function openCreate() {
  if (!canCreate.value) return;
  mode.value = 'create';
  resetForm();
  snapshotForm();
  drawerOpen.value = true;
}

function openEdit(header: AuthHeaderRecord) {
  if (!canUpdate.value) return;
  mode.value = 'edit';
  form.id = getId(header);
  form.headerKey = header.headerKey;
  form.credentialType = header.credentialType;
  form.scheme = header.scheme;
  form.priority = header.priority;
  form.isEnabled = header.isEnabled;
  form.isSystem = header.isSystem;
  form.description = header.description || '';
  headerKeyTouched.value = false;
  validationAttempted.value = false;
  snapshotForm();
  drawerOpen.value = true;
}

async function closeDrawer(force = false) {
  if (closingDrawer.value) return;
  if (!force && hasUnsavedChanges.value) {
    showDiscardModal.value = true;
    return;
  }
  if (!force) {
    drawerOpen.value = false;
    return;
  }
  closingDrawer.value = true;
  showDiscardModal.value = false;
  drawerOpen.value = false;
  initialForm.value = null;
  await nextTick();
  closingDrawer.value = false;
}

async function saveHeader() {
  validationAttempted.value = true;
  if (!canSave.value) return;
  saving.value = true;
  try {
    const body = {
      headerKey: form.headerKey,
      credentialType: form.credentialType,
      scheme: form.scheme,
      priority: Number(form.priority) || 0,
      isEnabled: form.isSystem ? true : form.isEnabled,
      description: form.description.trim() || null,
      ...(mode.value === 'create' ? { isSystem: false } : {}),
    };
    const response = mode.value === 'create'
      ? await createHeader({ body })
      : await updateHeader({ id: form.id || undefined, body });
    if (!response) return;
    notify.success('Saved', 'Authentication header mapping saved.');
    await fetchHeaders();
    await closeDrawer(true);
  } finally {
    saving.value = false;
  }
}

function confirmDiscard() {
  showDiscardModal.value = false;
  void closeDrawer(true);
}

async function toggleHeader(header: AuthHeaderRecord) {
  if (header.isSystem || !canUpdate.value || togglingHeaderId.value !== null) return;
  const id = getId(header);
  if (id == null) return;
  const nextEnabled = !header.isEnabled;
  togglingHeaderId.value = id;
  try {
    const response = await updateHeader({ id, body: { isEnabled: nextEnabled } });
    if (!response) return;
    await fetchHeaders();
    notify.success('Updated', `${header.headerKey} is now ${nextEnabled ? 'active' : 'inactive'}.`);
  } finally {
    togglingHeaderId.value = null;
  }
}

async function moveHeader(index: number, direction: -1 | 1) {
  if (moving.value || !canUpdate.value) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= headers.value.length) return;
  const ordered = [...headers.value];
  const [moved] = ordered.splice(index, 1);
  if (!moved) return;
  ordered.splice(nextIndex, 0, moved);
  moving.value = true;
  try {
    const updates = ordered
      .map((header, priority) => {
        const id = getId(header);
        return id == null ? null : { id, priority };
      })
      .filter((update): update is { id: string | number; priority: number } => update !== null);
    const response = await reorderHeadersApi({ body: { updates } });
    if (!response) return;
    await fetchHeaders();
  } finally {
    moving.value = false;
  }
}

async function deleteHeader(header: AuthHeaderRecord) {
  if (header.isSystem || !canDelete.value) return;
  const id = getId(header);
  if (id == null) return;
  const confirmed = await confirm({
    title: 'Delete authentication header?',
    content: `Requests using ${header.headerKey} will stop authenticating after deletion.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });
  if (!confirmed) return;
  const response = await deleteHeaderApi({ id });
  if (!response) return;
  notify.success('Deleted', `${header.headerKey} was removed.`);
  await fetchHeaders();
}

const columns: ColumnDef<Record<string, any>>[] = [
  { accessorKey: 'priority', header: 'Priority', enableSorting: false, cell: ({ row }) => String(headers.value.findIndex(item => String(getId(item)) === String(getId(row.original))) + 1) },
  settingsTextColumn('headerKey', 'Header'),
  { id: 'credential', header: 'Credential', enableSorting: false,
    cell: ({ row }) => `${row.original.credentialType.toUpperCase()} / ${row.original.scheme}`,
  },
  settingsTextColumn('description', 'Description'),
  { accessorKey: 'isSystem', header: 'Origin', enableSorting: false,
    cell: ({ getValue }) => h(UBadge, { label: getValue() ? 'System' : 'Custom', color: getValue() ? 'info' : 'neutral', variant: 'soft' }),
  },
  settingsStatusColumn(),
];

function getRowActions(row: Record<string, any>): DataTableRowAction[] {
  const header = row as AuthHeaderRecord;
  const index = headers.value.findIndex(item => String(getId(item)) === String(getId(header)));
  return [
    ...(canUpdate.value && index > 0 ? [{ label: 'Move up', icon: 'lucide:chevron-up', disabled: moving.value,
      onSelect: () => moveHeader(index, -1) }] : []),
    ...(canUpdate.value && index >= 0 && index < headers.value.length - 1 ? [{ label: 'Move down', icon: 'lucide:chevron-down', disabled: moving.value,
      onSelect: () => moveHeader(index, 1) }] : []),
    ...(canUpdate.value ? [{ label: 'Edit', icon: 'lucide:pencil', onSelect: () => openEdit(header) }] : []),
    ...(canUpdate.value && !header.isSystem ? [{ label: header.isEnabled ? 'Disable' : 'Enable', icon: 'lucide:power',
      disabled: moving.value || togglingHeaderId.value !== null, onSelect: () => toggleHeader(header) }] : []),
    ...(canDelete.value && !header.isSystem ? [{ label: 'Delete', icon: 'lucide:trash-2', color: 'error',
      onSelect: () => deleteHeader(header) }] : []),
  ];
}

await fetchHeaders();
</script>
