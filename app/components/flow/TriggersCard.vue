<template>
  <CommonFormCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-[var(--text-primary)]">Triggers</h3>
        <UPopover v-model:open="addOpen">
          <UButton icon="lucide:plus" size="sm" variant="solid" color="primary" label="Add Trigger" />
          <template #content>
            <div class="w-56 p-2 space-y-1">
              <button
                v-for="opt in triggerTypeOptions"
                :key="opt.value"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition hover:bg-[var(--surface-muted)]"
                @click="startAdd(opt.value)"
              >
                <UIcon :name="opt.icon" class="size-4" :style="{ color: `var(--st-${opt.color})` }" />
                <span style="color: var(--text-primary)">{{ opt.label }}</span>
              </button>
            </div>
          </template>
        </UPopover>
      </div>
    </template>

    <div v-if="!triggers.length" class="py-8 text-center">
      <UIcon name="lucide:zap" class="mx-auto size-8 text-[var(--text-tertiary)]" />
      <p class="mt-2 text-sm text-[var(--text-secondary)]">No triggers configured. This flow can only be run manually.</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="t in triggers"
        :key="t.id"
        class="flex items-center justify-between rounded-lg border p-3 transition"
        :style="{ borderColor: 'var(--border-subtle)', backgroundColor: t.isEnabled ? 'var(--bg-primary)' : 'var(--surface-muted)' }"
      >
        <div class="flex items-center gap-3">
          <UBadge :color="getTriggerColor(t.type)" variant="soft" size="sm">
            <UIcon :name="triggerIcon(t.type)" class="size-3 mr-1" />
            {{ t.type }}
          </UBadge>
          <span class="text-sm text-[var(--text-secondary)]">{{ triggerSummary(t) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <USwitch
            :model-value="t.isEnabled"
            size="sm"
            :loading="togglingId === t.id"
            @update:model-value="(v: boolean) => toggleTrigger(t, v)"
          />
          <UButton
            icon="lucide:trash-2"
            size="xs"
            variant="ghost"
            color="error"
            @click="removeTrigger(t)"
          />
        </div>
      </div>
    </div>

    <UModal v-model:open="editorOpen" :title="editorTitle">
      <template #body>
        <div class="space-y-4">
          <template v-if="editorForm.type === 'schedule'">
            <UFormField label="Cron expression">
              <UInput v-model="editorForm.cron" placeholder="0 2 * * *" class="w-full" />
              <template #hint>
                <span class="text-xs text-[var(--text-tertiary)]">Five fields: minute hour day month weekday</span>
              </template>
            </UFormField>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="p in cronPresets"
                :key="p.cron"
                size="xs"
                variant="soft"
                :color="editorForm.cron === p.cron ? 'primary' : 'neutral'"
                @click="editorForm.cron = p.cron"
              >
                {{ p.label }}
              </UButton>
            </div>
            <UFormField label="Timezone">
              <UInputMenu
                :model-value="selectedTzItem"
                :items="timezoneItems"
                v-model:search-term="tzSearchTerm"
                placeholder="Search timezone..."
                class="w-full"
                by="value"
                :filter="true"
                @update:model-value="onTzSelect"
              />
              <template #hint>
                <span class="text-xs text-[var(--text-tertiary)]">Cron runs in this timezone, defaults to your browser</span>
              </template>
            </UFormField>
          </template>

          <template v-else-if="editorForm.type === 'event'">
            <UFormField label="Table">
              <FlowTablePicker v-model="editorForm.tableId" value-key="id" />
              <template #hint>
                <span class="text-xs text-[var(--text-tertiary)]">Flow runs whenever a record in this table changes</span>
              </template>
            </UFormField>
            <UFormField label="Event type">
              <USelect
                v-model="editorForm.tableEvent"
                :items="tableEventOptions"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs text-[var(--text-tertiary)]">Which mutation fires the flow</span>
              </template>
            </UFormField>
          </template>

          <template v-else-if="editorForm.type === 'webhook'">
            <UFormField label="Route path">
              <UInputMenu
                :model-value="selectedRouteItem"
                :items="routeItems"
                v-model:search-term="routeSearchTerm"
                v-model:open="routeMenuOpen"
                placeholder="Search route..."
                class="w-full"
                by="value"
                :loading="routesLoading"
                :filter="false"
                @update:model-value="onRouteSelect"
              >
                <template #item="{ item }">
                  <div class="flex items-center gap-2 w-full">
                    <UIcon name="lucide:globe" class="size-3.5 text-[var(--text-quaternary)] flex-shrink-0" />
                    <span class="text-sm truncate">{{ item.label }}</span>
                  </div>
                </template>
                <template #empty>
                  <span class="text-xs text-[var(--text-quaternary)] px-2">{{ routesLoading ? 'Searching...' : 'No routes found' }}</span>
                </template>
              </UInputMenu>
              <template #hint>
                <span class="text-xs text-[var(--text-tertiary)]">Flow runs after this route's handler completes successfully</span>
              </template>
            </UFormField>
          </template>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="ghost" @click="editorOpen = false" />
          <UButton label="Save" variant="solid" color="primary" :loading="saving" @click="saveTrigger" />
        </div>
      </template>
    </UModal>
  </CommonFormCard>
</template>

<script setup lang="ts">
import type { FlowTrigger, TriggerType, TableEventType } from '~/types/flow';
import { getTriggerColor } from '~/utils/flow.constants';

const props = defineProps<{
  flowId: string | number;
  triggers: FlowTrigger[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const notify = useNotify();
const { confirm } = useConfirm();
const { getIdFieldName } = useDatabase();

const addOpen = ref(false);
const editorOpen = ref(false);
const saving = ref(false);
const togglingId = ref<string | number | null>(null);

const triggerTypeOptions = [
  { label: 'Schedule (Cron)', value: 'schedule' as TriggerType, icon: 'lucide:clock', color: 'info' },
  { label: 'Table Event', value: 'event' as TriggerType, icon: 'lucide:database', color: 'warning' },
  { label: 'Webhook', value: 'webhook' as TriggerType, icon: 'lucide:globe', color: 'success' },
];

const tableEventOptions = [
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
];

const cronPresets = [
  { label: 'Every minute', cron: '* * * * *' },
  { label: 'Every 5 min', cron: '*/5 * * * *' },
  { label: 'Hourly', cron: '0 * * * *' },
  { label: 'Daily 2AM', cron: '0 2 * * *' },
  { label: 'Weekly Mon', cron: '0 2 * * 1' },
];

const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const allTimezones = Intl.supportedValuesOf?.('timeZone')?.length
  ? Intl.supportedValuesOf('timeZone')
  : ['UTC'];
const timezoneItems = computed(() => {
  const term = tzSearchTerm.value?.toLowerCase() || '';
  const filtered = term
    ? allTimezones.filter(tz => tz.toLowerCase().includes(term))
    : allTimezones;
  return filtered.slice(0, 50).map(tz => ({ label: tz, value: tz }));
});
const tzSearchTerm = ref('');
const selectedTzItem = computed(() => {
  const tz = editorForm.value.timezone;
  return tz ? { label: tz, value: tz } : undefined;
});
function onTzSelect(item: any) {
  if (item?.value) editorForm.value.timezone = item.value;
}

const editorForm = ref({
  type: 'schedule' as TriggerType,
  cron: '0 2 * * *',
  timezone: browserTz,
  tableId: '',
  tableEvent: 'create' as TableEventType,
  routeId: '',
});

const editorTitle = computed(() => {
  const label = triggerTypeOptions.find(o => o.value === editorForm.value.type)?.label || 'Trigger';
  return `Add ${label}`;
});

function triggerIcon(type: string): string {
  return triggerTypeOptions.find(o => o.value === type)?.icon || 'lucide:zap';
}

function triggerSummary(t: FlowTrigger): string {
  if (t.type === 'schedule') return t.config?.cron || 'cron';
  if (t.type === 'event') return `${t.tableName || '?'} → ${t.tableEvent || '*'}`;
  if (t.type === 'webhook') return t.routePath || '?';
  return '';
}

function startAdd(type: TriggerType) {
  addOpen.value = false;
  editorForm.value = {
    type,
    cron: '0 2 * * *',
    timezone: browserTz,
    tableId: '',
    tableEvent: 'create',
    routeId: '',
  };
  if (type === 'webhook') void loadRoutes();
  editorOpen.value = true;
}

const routeSearchTerm = ref('');
const routeMenuOpen = ref(false);
const routes = ref<any[]>([]);
let routeDebounce: ReturnType<typeof setTimeout> | null = null;

const { execute: fetchRoutes, pending: routesLoading } = useApi(
  () => {
    const params = new URLSearchParams({ fields: 'id,path', limit: '20', sort: 'path' });
    if (routeSearchTerm.value) {
      params.set('filter', JSON.stringify({ path: { _contains: routeSearchTerm.value } }));
    }
    return `/enfyra_route?${params.toString()}`;
  },
  { errorContext: 'Fetch Routes' }
);

async function loadRoutes() {
  const response = await fetchRoutes();
  if (response) routes.value = response.data || [];
}

const routeItems = computed(() =>
  routes.value.map((r: any) => ({ label: r.path, value: String(r.id) }))
);

const selectedRouteItem = computed(() => {
  if (!editorForm.value.routeId) return undefined;
  const match = routes.value.find((r: any) => String(r.id) === editorForm.value.routeId);
  return match ? { label: match.path, value: String(match.id) } : undefined;
});

watch(routeSearchTerm, () => {
  if (routeDebounce) clearTimeout(routeDebounce);
  routeDebounce = setTimeout(() => loadRoutes(), 400);
});

watch(routeMenuOpen, (open) => {
  if (open && routes.value.length === 0) void loadRoutes();
});

function onRouteSelect(item: any) {
  if (item?.value) editorForm.value.routeId = item.value;
}

async function saveTrigger() {
  const form = editorForm.value;
  saving.value = true;
  try {
    if (form.type === 'webhook') {
      if (!form.routeId) { notify.error('Error', 'Please select a route'); saving.value = false; return; }
      const { execute: createTrigger, error: triggerError } = useApi(() => '/enfyra_flow_trigger', { method: 'post', errorContext: 'Create Trigger' });
      await createTrigger({
        body: {
          flow: { [getIdFieldName()]: props.flowId },
          type: 'webhook',
          isEnabled: true,
          config: {},
          route: { [getIdFieldName()]: form.routeId },
        },
      });
      if (triggerError.value) { saving.value = false; return; }
    } else if (form.type === 'event') {
      if (!form.tableId) { notify.error('Error', 'Please select a table'); saving.value = false; return; }
      const { execute: createTrigger, error: triggerError } = useApi(() => '/enfyra_flow_trigger', { method: 'post', errorContext: 'Create Trigger' });
      await createTrigger({
        body: {
          flow: { [getIdFieldName()]: props.flowId },
          type: 'event',
          isEnabled: true,
          config: {},
          tableEvent: form.tableEvent,
          table: { [getIdFieldName()]: form.tableId },
        },
      });
      if (triggerError.value) { saving.value = false; return; }
    } else {
      const { execute: createTrigger, error: triggerError } = useApi(() => '/enfyra_flow_trigger', { method: 'post', errorContext: 'Create Trigger' });
      await createTrigger({
        body: {
          flow: { [getIdFieldName()]: props.flowId },
          type: 'schedule',
          isEnabled: true,
          config: { cron: form.cron, timezone: form.timezone },
        },
      });
      if (triggerError.value) { saving.value = false; return; }
    }
    notify.success('Success', 'Trigger added');
    editorOpen.value = false;
    emit('refresh');
  } finally {
    saving.value = false;
  }
}

async function toggleTrigger(t: FlowTrigger, enabled: boolean) {
  togglingId.value = t.id;
  const { execute: patchTrigger, error } = useApi(() => '/enfyra_flow_trigger', { method: 'patch', errorContext: 'Toggle Trigger' });
  try {
    await patchTrigger({ body: { isEnabled: enabled }, id: t.id });
    if (error.value) return;
    t.isEnabled = enabled;
  } finally {
    togglingId.value = null;
  }
}

async function removeTrigger(t: FlowTrigger) {
  const ok = await confirm({ title: 'Remove Trigger', content: `Remove this ${t.type} trigger?`, confirmText: 'Remove', cancelText: 'Cancel' });
  if (!ok) return;
  const { execute: deleteTrigger, error } = useApi(() => '/enfyra_flow_trigger', { method: 'delete', errorContext: 'Delete Trigger' });
  await deleteTrigger({ id: t.id });
  if (error.value) return;
  notify.success('Success', 'Trigger removed');
  emit('refresh');
}
</script>
