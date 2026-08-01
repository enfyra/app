<template>
  <CommonFormCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold text-[var(--text-primary)]">Flow Triggers</h3>
          <UBadge size="xs" color="neutral" variant="soft">{{ triggers.length }}</UBadge>
        </div>
        <UPopover v-model:open="addOpen">
          <UButton icon="lucide:plus" size="sm" variant="solid" color="primary" label="Attach Flow" />
          <template #content>
            <div class="w-72 p-3 space-y-3">
              <UFormField label="Flow">
                <UInputMenu
                  :model-value="selectedFlowItem"
                  :items="flowItems"
                  v-model:search-term="flowSearchTerm"
                  v-model:open="flowMenuOpen"
                  placeholder="Search flow..."
                  class="w-full"
                  by="value"
                  :loading="flowsLoading"
                  :filter="false"
                  @update:model-value="onFlowSelect"
                >
                  <template #item="{ item }">
                    <div class="flex items-center gap-2 w-full">
                      <UIcon name="lucide:workflow" class="size-3.5 text-[var(--text-quaternary)] flex-shrink-0" />
                      <span class="text-sm truncate">{{ item.label }}</span>
                    </div>
                  </template>
                  <template #empty>
                    <span class="text-xs text-[var(--text-quaternary)] px-2">{{ flowsLoading ? 'Searching...' : 'No flows found' }}</span>
                  </template>
                </UInputMenu>
              </UFormField>
              <UFormField v-if="mode === 'table'" label="Event type">
                <USelect v-model="newTableEvent" :items="tableEventOptions" class="w-full" />
              </UFormField>
              <UButton
                label="Attach"
                color="primary"
                variant="solid"
                class="w-full"
                :disabled="!newFlowId"
                :loading="attaching"
                @click="attachFlow"
              />
            </div>
          </template>
        </UPopover>
      </div>
    </template>

    <div v-if="loadingTriggers" class="py-6 flex justify-center">
      <UIcon name="lucide:loader-circle" class="size-5 animate-spin text-[var(--text-tertiary)]" />
    </div>

    <div v-else-if="!triggers.length" class="py-8 text-center">
      <UIcon name="lucide:zap-off" class="mx-auto size-8 text-[var(--text-tertiary)]" />
      <p class="mt-2 text-sm text-[var(--text-secondary)]">
        {{ mode === 'route' ? 'No flow is triggered when this route runs.' : 'No flow reacts to changes in this table.' }}
      </p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="t in triggers"
        :key="t.id"
        class="flex items-center justify-between rounded-lg border p-3 transition hover:border-[var(--border-default)]"
        :style="{ borderColor: 'var(--border-subtle)', backgroundColor: t.isEnabled ? 'var(--bg-primary)' : 'var(--surface-muted)' }"
      >
        <div class="flex items-center gap-3 min-w-0">
          <UBadge :color="getTriggerColor(t.type)" variant="soft" size="sm" class="shrink-0">
            <UIcon :name="t.type === 'webhook' ? 'lucide:globe' : 'lucide:database'" class="size-3 mr-1" />
            {{ t.type === 'webhook' ? 'webhook' : t.tableEvent }}
          </UBadge>
          <NuxtLink
            :to="`/settings/flows/${t.flow?.id}`"
            class="text-sm font-medium text-[var(--text-primary)] hover:underline truncate"
          >
            {{ t.flow?.name || `Flow #${t.flow?.id}` }}
          </NuxtLink>
          <UBadge v-if="!t.isEnabled" size="xs" color="neutral" variant="outline">disabled</UBadge>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <USwitch :model-value="t.isEnabled" size="sm" :loading="togglingId === t.id" @update:model-value="(v: boolean) => toggleTrigger(t, v)" />
          <UButton icon="lucide:unlink" size="xs" variant="ghost" color="error" @click="detachTrigger(t)" />
        </div>
      </div>
    </div>
  </CommonFormCard>
</template>

<script setup lang="ts">
import type { TableEventType } from '~/types/flow';
import { getTriggerColor } from '~/utils/flow.constants';

const props = defineProps<{
  mode: 'route' | 'table';
  routeId?: string | number;
  tableId?: string | number;
}>();

const notify = useNotify();
const { confirm } = useConfirm();
const { getIdFieldName } = useDatabase();

const idField = getIdFieldName();
const addOpen = ref(false);
const newFlowId = ref('');
const newTableEvent = ref<TableEventType>('create');
const attaching = ref(false);
const togglingId = ref<string | number | null>(null);

const tableEventOptions = [
  { label: 'On Create', value: 'create' },
  { label: 'On Update', value: 'update' },
  { label: 'On Delete', value: 'delete' },
];

const filterKey = props.mode === 'route' ? 'route' : 'table';
const entityFilter = computed(() =>
  JSON.stringify({ [filterKey]: { id: { _eq: props.mode === 'route' ? props.routeId : props.tableId } } })
);

const { data: triggerData, execute: fetchTriggers, pending: loadingTriggers } = useApi(
  () => `/enfyra_flow_trigger?filter=${entityFilter.value}&fields=id,type,isEnabled,config,tableEvent,flow.id,flow.name&limit=100`,
  { errorContext: 'Fetch Flow Triggers' }
);

const triggers = computed(() => triggerData.value?.data || []);

const flowSearchTerm = ref('');
const flowMenuOpen = ref(false);
const flows = ref<any[]>([]);
let flowDebounce: ReturnType<typeof setTimeout> | null = null;

const { execute: fetchFlows, pending: flowsLoading } = useApi(
  () => {
    const params = new URLSearchParams({ fields: 'id,name', limit: '20', sort: 'name' });
    if (flowSearchTerm.value) {
      params.set('filter', JSON.stringify({ name: { _contains: flowSearchTerm.value } }));
    }
    return `/enfyra_flow?${params.toString()}`;
  },
  { errorContext: 'Fetch Flows' }
);

async function loadFlows() {
  const response = await fetchFlows();
  if (response) flows.value = response.data || [];
}

const flowItems = computed(() =>
  flows.value.map((f: any) => ({ label: f.name, value: String(f.id) }))
);

const selectedFlowItem = computed(() => {
  if (!newFlowId.value) return undefined;
  const match = flows.value.find((f: any) => String(f.id) === newFlowId.value);
  return match ? { label: match.name, value: String(match.id) } : undefined;
});

watch(flowSearchTerm, () => {
  if (flowDebounce) clearTimeout(flowDebounce);
  flowDebounce = setTimeout(() => loadFlows(), 400);
});

watch(flowMenuOpen, (open) => {
  if (open && flows.value.length === 0) void loadFlows();
});

function onFlowSelect(item: any) {
  if (item?.value) newFlowId.value = item.value;
}

async function attachFlow() {
  if (!newFlowId.value) return;
  attaching.value = true;
  try {
    const body: any = {
      flow: { [idField]: newFlowId.value },
      type: props.mode === 'route' ? 'webhook' : 'event',
      isEnabled: true,
      config: {},
    };
    if (props.mode === 'route') {
      body.route = { [idField]: props.routeId };
    } else {
      body.table = { [idField]: props.tableId };
      body.tableEvent = newTableEvent.value;
    }
    const { execute: createTrigger, error } = useApi(() => '/enfyra_flow_trigger', { method: 'post', errorContext: 'Attach Flow' });
    await createTrigger({ body });
    if (error.value) return;
    notify.success('Success', 'Flow attached');
    addOpen.value = false;
    newFlowId.value = '';
    await fetchTriggers();
  } finally {
    attaching.value = false;
  }
}

async function toggleTrigger(t: any, enabled: boolean) {
  togglingId.value = t.id;
  const { execute: patchTrigger, error } = useApi(() => '/enfyra_flow_trigger', { method: 'patch', errorContext: 'Toggle Trigger' });
  try {
    await patchTrigger({ body: { isEnabled: enabled }, id: t.id });
    if (error.value) return;
    if (triggerData.value?.data) {
      const idx = triggerData.value.data.findIndex((item: any) => item.id === t.id);
      if (idx !== -1) triggerData.value.data[idx].isEnabled = enabled;
    }
  } finally {
    togglingId.value = null;
  }
}

async function detachTrigger(t: any) {
  const ok = await confirm({
    title: 'Detach Flow',
    content: `Detach "${t.flow?.name}" from this ${props.mode}?`,
    confirmText: 'Detach',
    cancelText: 'Cancel',
  });
  if (!ok) return;
  const { execute: deleteTrigger, error } = useApi(() => '/enfyra_flow_trigger', { method: 'delete', errorContext: 'Detach Flow' });
  await deleteTrigger({ id: t.id });
  if (error.value) return;
  notify.success('Success', 'Flow detached');
  await fetchTriggers();
}

onMounted(() => {
  void fetchTriggers();
});
</script>
