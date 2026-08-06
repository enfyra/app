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

      <CommonResourceListFrame
        v-if="showInitialLoading"
        variant="plain"
        :loading="true"
        :has-items="false"
        loading-title="Loading authentication headers..."
        loading-description="Fetching the active header resolution order"
      />

      <CommonEmptyState
        v-else-if="headers.length === 0"
        title="No authentication headers"
        description="Add a header mapping to let requests authenticate through a custom request header."
        icon="lucide:key-round"
        size="sm"
      >
        <UButton
          v-if="canCreate"
          label="Add header mapping"
          icon="lucide:plus"
          color="primary"
          variant="solid"
          @click="openCreate"
        />
      </CommonEmptyState>

      <div v-else class="space-y-2">
        <div class="mb-3 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <UIcon name="lucide:grip-vertical" class="size-4" />
          <span>Drag a mapping or use the arrow controls to change priority.</span>
        </div>

        <div
          v-for="(header, index) in headers"
          :key="String(getId(header) ?? `${header.headerKey}-${header.credentialType}-${header.scheme}`)"
          class="surface-card flex flex-col gap-3 p-4 transition sm:flex-row sm:items-center"
          :class="[
            dragIndex === index ? 'opacity-60' : '',
            getDropClass(index),
          ]"
          draggable="true"
          @dragstart="startDrag(index, $event)"
          @dragover="handleDragOver(index, $event)"
          @dragleave="handleDragLeave"
          @drop.prevent="dropHeader(index, $event)"
          @dragend="endDrag"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              class="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-[var(--radius-control)] text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] active:cursor-grabbing"
              :aria-label="`Drag ${header.headerKey}`"
            >
              <UIcon name="lucide:grip-vertical" class="size-5" />
            </button>
            <div class="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--state-primary-soft-bg)] text-sm font-semibold text-[var(--state-primary-soft-text)]">
              {{ index + 1 }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <code class="truncate text-sm font-semibold text-[var(--text-primary)]">{{ header.headerKey }}</code>
                <UBadge
                  :color="header.isSystem ? 'info' : 'primary'"
                  variant="soft"
                  size="xs"
                >
                  {{ header.isSystem ? 'System' : 'Custom' }}
                </UBadge>
                <UBadge color="neutral" variant="outline" size="xs">
                  {{ header.credentialType.toUpperCase() }} / {{ header.scheme }}
                </UBadge>
              </div>
              <p class="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                {{ header.description || 'No description' }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 sm:justify-end">
            <div class="flex items-center gap-1">
              <UButton
                icon="lucide:chevron-up"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="index === 0 || moving"
                :aria-label="`Move ${header.headerKey} up`"
                @click="moveHeader(index, -1)"
              />
              <UButton
                icon="lucide:chevron-down"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="index === headers.length - 1 || moving"
                :aria-label="`Move ${header.headerKey} down`"
                @click="moveHeader(index, 1)"
              />
            </div>

            <USwitch
              :model-value="header.isEnabled"
              :disabled="header.isSystem || !canUpdate || moving"
              :aria-label="`${header.headerKey} enabled`"
              @update:model-value="toggleHeader(header)"
            />

            <UButton
              icon="lucide:pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="!canUpdate"
              :aria-label="`Edit ${header.headerKey}`"
              @click="openEdit(header)"
            />
            <UButton
              icon="lucide:trash-2"
              color="error"
              variant="ghost"
              size="sm"
              :disabled="header.isSystem || !canDelete"
              :aria-label="`Delete ${header.headerKey}`"
              @click="deleteHeader(header)"
            />
          </div>
        </div>
      </div>
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
const dragIndex = ref<number | null>(null);
const dropTargetIndex = ref<number | null>(null);
const dropPosition = ref<'before' | 'after' | null>(null);
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
  if (header.isSystem || !canUpdate.value) return;
  const id = getId(header);
  if (id == null) return;
  const nextEnabled = !header.isEnabled;
  const response = await updateHeader({ id, body: { isEnabled: nextEnabled } });
  if (!response) return;
  await fetchHeaders();
  notify.success('Updated', `${header.headerKey} is now ${nextEnabled ? 'active' : 'inactive'}.`);
}

function startDrag(index: number, event: DragEvent) {
  dragIndex.value = index;
  dropTargetIndex.value = null;
  dropPosition.value = null;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function endDrag() {
  dragIndex.value = null;
  dropTargetIndex.value = null;
  dropPosition.value = null;
}

function handleDragOver(index: number, event: DragEvent) {
  if (dragIndex.value == null || moving.value) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  dropTargetIndex.value = index;
  dropPosition.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function handleDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement | null;
  const related = event.relatedTarget as Node | null;
  if (current && related && current.contains(related)) return;
  dropTargetIndex.value = null;
  dropPosition.value = null;
}

function getDropClass(index: number): string {
  if (dragIndex.value == null || dropTargetIndex.value !== index || !dropPosition.value) {
    return '';
  }
  return `drop-target drop-target--${dropPosition.value}`;
}

async function dropHeader(targetIndex: number, event: DragEvent) {
  const sourceIndex = dragIndex.value;
  const activeTargetIndex = dropTargetIndex.value ?? targetIndex;
  const activePosition = dropPosition.value ?? (() => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  })();
  const insertIndex = activeTargetIndex + (activePosition === 'after' ? 1 : 0);
  endDrag();
  if (sourceIndex == null) return;

  const nextIndex = Math.max(
    0,
    Math.min(headers.value.length - 1, insertIndex > sourceIndex ? insertIndex - 1 : insertIndex),
  );
  if (sourceIndex === nextIndex) return;
  await moveHeader(sourceIndex, -1, nextIndex);
}

async function moveHeader(index: number, direction: -1 | 1, targetIndex?: number) {
  if (moving.value || !canUpdate.value) return;
  const nextIndex = targetIndex ?? index + direction;
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

await fetchHeaders();
</script>

<style scoped>
.drop-target {
  position: relative;
}

.drop-target::after {
  position: absolute;
  z-index: 2;
  right: 1rem;
  left: 1rem;
  height: 3px;
  border-radius: 9999px;
  background: var(--state-primary-solid-bg);
  box-shadow: 0 0 0 2px var(--state-primary-soft-bg), 0 4px 14px color-mix(in srgb, var(--state-primary-solid-bg) 35%, transparent);
  content: '';
  pointer-events: none;
}

.drop-target--before::after {
  top: -2px;
}

.drop-target--after::after {
  bottom: -2px;
}
</style>
