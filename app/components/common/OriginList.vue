<template>
  <div class="space-y-4">
    <p class="text-xs leading-relaxed text-[var(--text-secondary)]">{{ helpText }}</p>
    <UAlert v-if="loadError" color="error" title="Could not load origins" description="Reload to try again." />
    <CommonLoadingState
      v-else-if="loading && origins.length === 0"
      :title="`Loading ${label.toLowerCase()} origins…`"
      description="Fetching origins from the server"
      size="sm"
      type="skeleton"
      context="inline"
      class="min-h-[8rem]"
    />
    <ul v-else-if="origins.length > 0" class="divide-y divide-[var(--border-default)] overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-default)]">
      <li v-for="origin in origins" :key="origin.id" class="flex min-h-11 items-center gap-3 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate font-mono text-sm text-[var(--text-primary)]" :class="{ 'opacity-60': !origin.isEnabled }" :title="origin.value">{{ origin.value }}</span>
        <USwitch :model-value="origin.isEnabled" :loading="busyId === String(origin.id)" :disabled="busy || !canUpdate" :aria-label="`Toggle ${origin.value}`" @update:model-value="(value: boolean) => toggleEnabled(origin, value)" />
        <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" square class="shrink-0" :disabled="busy || !canDelete" :aria-label="`Remove ${origin.value}`" @click="removeOrigin(origin)" />
      </li>
    </ul>
    <div v-else class="rounded-[var(--radius-control)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)]/40 px-4 py-5 text-center text-sm text-[var(--text-tertiary)]">{{ emptyText }}</div>
    <div v-if="canCreate" class="flex items-center gap-2">
      <UInput v-model="newOrigin" placeholder="https://your-app.example.com" class="min-w-0 flex-1 font-mono text-sm" :disabled="busy" @keyup.enter="addOrigin" />
      <UButton icon="i-lucide-plus" color="primary" variant="solid" size="lg" square class="h-11 w-11 shrink-0 justify-center" :aria-label="`Add ${label} origin`" :loading="creating" :disabled="!newOrigin.trim() || busy" @click="addOrigin" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShellOriginRecord, ShellListResponse } from '~/types/shell-api';
import { normalizeAuthOrigin } from '~/utils/auth-origin';

const props = defineProps<{ kind: 'cors' | 'auth' }>();
const notify = useNotify();
const { confirm } = useConfirm();
const { getId } = useDatabase();
const { checkPermissionCondition } = usePermissions();
const endpoint = computed(() => props.kind === 'auth' ? '/enfyra_auth_origin' : '/enfyra_cors_origin');
const label = computed(() => props.kind === 'auth' ? 'Auth' : 'CORS');
const helpText = computed(() => props.kind === 'auth'
  ? 'Register exact HTTP or HTTPS origins allowed to receive authentication redirects. This does not restrict API CORS. Your current Admin origin remains available.'
  : 'Full origins only (scheme, host, port). Example: https://app.example.com or http://localhost:3000. With no enabled origins, every origin is allowed without cross-origin cookies. Authentication redirects are configured separately under OAuth → Auth Origins.');
const emptyText = computed(() => props.kind === 'auth'
  ? 'No trusted external applications. External authentication redirects are denied.'
  : 'No origins in the list. Public cross-origin requests are allowed without cookies.');
const canCreate = computed(() => checkPermissionCondition({ and: [{ route: endpoint.value, methods: ['POST'] }] }));
const canUpdate = computed(() => checkPermissionCondition({ and: [{ route: endpoint.value, methods: ['PATCH'] }] }));
const canDelete = computed(() => checkPermissionCondition({ and: [{ route: endpoint.value, methods: ['DELETE'] }] }));
const newOrigin = ref('');
const creating = ref(false);
const busyId = ref<string | null>(null);
const busy = computed(() => loading.value || creating.value || busyId.value !== null);
const { data, pending: loading, error: loadError, execute: refresh } = useApi<ShellListResponse<ShellOriginRecord>>(() => endpoint.value, {
  query: { fields: 'id,value,isEnabled', sort: 'value', limit: 0 },
  errorContext: `Load ${props.kind === 'auth' ? 'Auth' : 'CORS'} Origins`,
});
const origins = computed(() => (data.value?.data ?? []).map(row => ({ id: getId(row), value: row.value, isEnabled: row.isEnabled !== false })));
const { execute: create, error: createError } = useApi(() => endpoint.value, { method: 'post', errorContext: 'Add Origin' });
const { execute: update, error: updateError } = useApi(() => endpoint.value, { method: 'patch', errorContext: 'Update Origin' });
const { execute: remove, error: removeError } = useApi(() => endpoint.value, { method: 'delete', errorContext: 'Delete Origin' });

async function addOrigin() {
  if (busy.value || !canCreate.value) return;
  const value = normalizeAuthOrigin(newOrigin.value);
  if (!value) {
    notify.warning('Invalid Origin', 'Enter an HTTP or HTTPS origin without credentials, path, query or fragment.');
    return;
  }
  if (origins.value.some(origin => origin.value === value)) {
    notify.warning('Duplicate Origin', `Origin "${value}" is already in the list.`);
    return;
  }
  creating.value = true;
  try {
    await create({ body: { value, isEnabled: true } });
    if (createError.value) return;
    newOrigin.value = '';
    notify.success('Success', `${label.value} origin added.`);
    await refresh();
  } finally {
    creating.value = false;
  }
}

async function toggleEnabled(origin: { id: string | number; value: string }, value: boolean) {
  if (busy.value || !canUpdate.value) return;
  busyId.value = String(origin.id);
  try {
    await update({ id: origin.id, body: { isEnabled: value } });
    if (updateError.value) return;
    notify.success('Success', `${label.value} origin updated.`);
    await refresh();
  } finally {
    busyId.value = null;
  }
}

async function removeOrigin(origin: { id: string | number; value: string }) {
  if (busy.value || !canDelete.value) return;
  const ok = await confirm({ title: `Remove ${label.value} Origin`, content: `Remove "${origin.value}"?`, confirmText: 'Remove', cancelText: 'Cancel' });
  if (!ok || busy.value) return;
  busyId.value = String(origin.id);
  try {
    await remove({ id: origin.id });
    if (removeError.value) return;
    notify.success('Success', `${label.value} origin removed.`);
    await refresh();
  } finally {
    busyId.value = null;
  }
}

defineExpose({ refresh, loading });
onMounted(() => { void refresh(); });
</script>
