<script setup lang="ts">
import type {
  WebsocketEventDataShapeField,
  WebsocketEventDataShapeToken,
} from '../../types/websocket-event-data-shape';

type FlowSelectItem = {
  label: string;
  value: string;
  description: string;
  icon: string;
};

const props = defineProps<{
  modelValue: WebsocketEventDataShapeField[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: WebsocketEventDataShapeField[]];
}>();

const shape = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value),
});

const tokens = computed<WebsocketEventDataShapeToken[]>(() =>
  flattenWebsocketEventDataShapeTokens(shape.value),
);
const samplePayload = computed(() =>
  buildWebsocketEventDataShapeSample(shape.value),
);
const { getId } = useDatabase();
const actionType = ref('emitToRoom');
const roomTemplate = ref('room:{{ data.roomId }}');
const userTemplate = ref('{{ data.targetUserId }}');
const emitEvent = ref('event:update');
const payloadExpression = ref('$data');
const selectedFlowId = ref<string>();
const flowMenuOpen = ref(false);
const flowsLoaded = ref(false);
const flowSearchTerm = ref('');
const selectedToken = ref('');
let flowSearchTimer: ReturnType<typeof setTimeout> | null = null;

const {
  data: flowsData,
  pending: flowsLoading,
  execute: fetchFlows,
} = useApi(() => '/flow_definition', {
  query: computed(() => ({
    fields: ['*'].join(','),
    limit: 10,
    sort: ['name'].join(','),
    ...(flowSearchTerm.value.trim()
      ? { filter: { name: { _contains: flowSearchTerm.value.trim() } } }
      : {}),
  })),
  errorContext: 'Fetch Flows',
});

const actionItems = [
  {
    label: 'Join Room',
    value: 'joinRoom',
    description: 'Join current socket to a room resolved from the payload.',
  },
  {
    label: 'Leave Room',
    value: 'leaveRoom',
    description: 'Remove current socket from a room.',
  },
  {
    label: 'Emit to Room',
    value: 'emitToRoom',
    description: 'Send an event to every socket in the resolved room.',
  },
  {
    label: 'Emit to User',
    value: 'emitToUser',
    description: 'Send an event to the user room for one user id.',
  },
  {
    label: 'Reply to Sender',
    value: 'reply',
    description: 'Send an event back to the current socket only.',
  },
  {
    label: 'Broadcast',
    value: 'broadcast',
    description: 'Send an event to every socket in this gateway.',
  },
  {
    label: 'Disconnect',
    value: 'disconnect',
    description: 'Disconnect the current socket.',
  },
];

const tokenItems = computed(() =>
  tokens.value.map((token) => ({
    label: token.label,
    value: token.value,
    fieldType: token.type,
  })),
);

const flowItems = computed<FlowSelectItem[]>(() =>
  (flowsData.value?.data || [])
    .map((flow: any) => {
      const value = getId(flow);
      return {
        label: flow.name || `Flow ${value}`,
        value: value == null ? '' : String(value),
        description: flow.description || (flow.isEnabled === false ? 'Disabled' : 'Enabled'),
        icon: flow.isEnabled === false ? 'lucide:pause-circle' : 'lucide:workflow',
      };
    })
    .filter((item: FlowSelectItem) => item.value),
);

const selectedFlow = computed(() =>
  flowItems.value.find((item) => item.value === selectedFlowId.value),
);

const selectedFlowItem = computed(() => selectedFlow.value);

const resolvedRoomPreview = computed(() =>
  resolveTemplate(roomTemplate.value),
);

const resolvedUserPreview = computed(() => resolveTemplate(userTemplate.value));

const actionNeedsRoom = computed(() =>
  ['joinRoom', 'leaveRoom', 'emitToRoom'].includes(actionType.value),
);
const actionNeedsUser = computed(() => actionType.value === 'emitToUser');
const actionNeedsEvent = computed(() =>
  ['emitToRoom', 'emitToUser', 'reply', 'broadcast'].includes(actionType.value),
);
const actionNeedsPayload = computed(() =>
  ['emitToRoom', 'emitToUser', 'reply', 'broadcast'].includes(actionType.value),
);
const actionAllowsFlow = computed(() => actionType.value !== 'disconnect');
const selectedAction = computed(
  () => actionItems.find((item) => item.value === actionType.value) || actionItems[0],
);

watch(flowMenuOpen, (open) => {
  if (open && !flowsLoaded.value && !flowsLoading.value) {
    loadFlows();
  }
});

watch(flowSearchTerm, () => {
  if (!flowMenuOpen.value) return;
  if (flowSearchTimer) clearTimeout(flowSearchTimer);
  flowSearchTimer = setTimeout(() => {
    loadFlows();
  }, 300);
});

const actionPreview = computed(() => {
  switch (actionType.value) {
    case 'joinRoom':
      return `$socket.join("${resolvedRoomPreview.value}")`;
    case 'leaveRoom':
      return `$socket.leave("${resolvedRoomPreview.value}")`;
    case 'emitToUser':
      return `$socket.emitToUser("${resolvedUserPreview.value}", "${emitEvent.value}", ${payloadExpression.value})`;
    case 'reply':
      return `$socket.reply("${emitEvent.value}", ${payloadExpression.value})`;
    case 'broadcast':
      return `$socket.broadcast("${emitEvent.value}", ${payloadExpression.value})`;
    case 'disconnect':
      return '$socket.disconnect()';
    default:
      return `$socket.emitToRoom("${resolvedRoomPreview.value}", "${emitEvent.value}", ${payloadExpression.value})`;
  }
});

function appendSelectedToken(target: 'room' | 'user' | 'payload') {
  const token = selectedToken.value;
  if (!token) return;
  if (target === 'room') {
    roomTemplate.value = `${roomTemplate.value || ''}${token}`;
    return;
  }
  if (target === 'user') {
    userTemplate.value = `${userTemplate.value || ''}${token}`;
    return;
  }
  payloadExpression.value = token.replace(/\{\{\s*/, '').replace(/\s*\}\}/, '');
}

function setTemplateFromToken(target: 'room' | 'user') {
  const token = selectedToken.value;
  if (!token) return;
  if (target === 'room') {
    roomTemplate.value = token;
    return;
  }
  userTemplate.value = token;
}

async function loadFlows() {
  await fetchFlows();
  flowsLoaded.value = true;
}

function selectFlow(item: FlowSelectItem | undefined) {
  selectedFlowId.value = item?.value;
}

onUnmounted(() => {
  if (flowSearchTimer) clearTimeout(flowSearchTimer);
});

function resolveTemplate(template: string) {
  return template.replace(/\{\{\s*data\.([^}\s]+)\s*\}\}/g, (_, path) => {
    const value = getPathValue(samplePayload.value, String(path));
    return value == null ? '' : String(value);
  });
}

function getPathValue(source: Record<string, unknown>, path: string) {
  return path.split('.').reduce<any>((current, segment) => {
    if (current == null) return undefined;
    const normalized = segment.endsWith('[]') ? segment.slice(0, -2) : segment;
    const value = current[normalized];
    return Array.isArray(value) ? value[0] : value;
  }, source);
}
</script>

<template>
  <div class="space-y-4">
    <div class="surface-card rounded-xl p-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-[var(--text-primary)]">Event Data Shape</div>
          <div class="text-xs text-[var(--text-tertiary)]">Declare payload fields used by native socket actions and flows.</div>
        </div>
        <UBadge variant="soft" color="neutral">Native event</UBadge>
      </div>

      <WebsocketDataShapeGroup v-model="shape" />
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="surface-card rounded-xl p-3 space-y-4 sm:p-4 sm:space-y-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-start gap-2">
            <UIcon name="lucide:radio" class="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div class="text-sm font-semibold text-[var(--text-primary)]">Socket Action</div>
              <div class="text-xs text-[var(--text-tertiary)]">
                Configure the native <span class="font-mono">$socket</span> primitive for this event. Data token only helps fill templates from the payload shape.
              </div>
            </div>
          </div>
          <UBadge variant="soft" color="primary">{{ selectedAction?.label }}</UBadge>
        </div>

        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(260px,1fr)]">
          <div>
            <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Action</div>
            <USelect
              v-model="actionType"
              :items="actionItems"
              value-key="value"
              class="w-full"
            />
            <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
              {{ selectedAction?.description }}
            </div>
          </div>
          <div>
            <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Data token</div>
            <USelect
              v-model="selectedToken"
              :items="tokenItems"
              value-key="value"
              placeholder="Select data field"
              class="w-full"
            />
            <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Use token buttons below to insert <span v-pre class="font-mono">{{ data.field }}</span> into the target field.
            </div>
          </div>
        </div>

        <div v-if="actionNeedsEvent">
          <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Emit event</div>
          <UInput v-model="emitEvent" class="w-full" placeholder="event:update" />
        </div>

        <div v-if="actionNeedsRoom">
          <div class="mb-1 flex items-center justify-between gap-2">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Room template</div>
            <div class="flex gap-1">
              <UButton size="xs" variant="soft" :disabled="!selectedToken" @click="appendSelectedToken('room')">
                Insert token
              </UButton>
              <UButton size="xs" variant="ghost" :disabled="!selectedToken" @click="setTemplateFromToken('room')">
                Use token only
              </UButton>
            </div>
          </div>
          <UInput v-model="roomTemplate" class="w-full font-mono" placeholder="room:{{ data.roomId }}" />
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Preview: <span class="font-mono">{{ resolvedRoomPreview || '-' }}</span>
          </div>
        </div>

        <div v-if="actionNeedsUser">
          <div class="mb-1 flex items-center justify-between gap-2">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">User id template</div>
            <div class="flex gap-1">
              <UButton size="xs" variant="soft" :disabled="!selectedToken" @click="appendSelectedToken('user')">
                Insert token
              </UButton>
              <UButton size="xs" variant="ghost" :disabled="!selectedToken" @click="setTemplateFromToken('user')">
                Use token only
              </UButton>
            </div>
          </div>
          <UInput v-model="userTemplate" class="w-full font-mono" placeholder="{{ data.targetUserId }}" />
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Preview: <span class="font-mono">{{ resolvedUserPreview || '-' }}</span>
          </div>
        </div>

        <div v-if="actionNeedsPayload">
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Payload expression</div>
            <UButton size="xs" variant="ghost" :disabled="!selectedToken" @click="appendSelectedToken('payload')">
              Use selected field
            </UButton>
          </div>
          <UInput v-model="payloadExpression" class="w-full font-mono" placeholder="$data" />
        </div>

        <div class="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
          <div class="mb-1 text-xs font-semibold text-[var(--text-secondary)]">Action preview</div>
          <div class="max-w-full whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-[var(--text-tertiary)] sm:break-words sm:text-xs">
            {{ actionPreview }}
          </div>
        </div>

        <div v-if="actionAllowsFlow" class="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
          <div class="mb-2 flex min-w-0 items-center gap-2">
            <UIcon name="lucide:workflow" class="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <div class="min-w-0 text-xs font-semibold text-[var(--text-secondary)]">
              Trigger Flow <span class="text-[var(--text-tertiary)]">(fire-and-forget)</span>
            </div>
          </div>
          <UInputMenu
            :model-value="selectedFlowItem"
            :items="flowItems"
            v-model:open="flowMenuOpen"
            v-model:search-term="flowSearchTerm"
            by="value"
            :filter="false"
            :loading="flowsLoading"
            placeholder="Search flow to trigger"
            class="w-full"
            @update:model-value="selectFlow"
          >
            <template #leading>
              <UIcon name="lucide:workflow" class="h-4 w-4 text-[var(--text-quaternary)]" />
            </template>
            <template #item="{ item }">
              <div class="flex min-w-0 items-center gap-2">
                <UIcon :name="item.icon" class="h-3.5 w-3.5 shrink-0 text-[var(--text-quaternary)]" />
                <div class="min-w-0">
                  <div class="truncate text-sm">{{ item.label }}</div>
                  <div class="truncate text-[11px] text-[var(--text-tertiary)]">{{ item.description }}</div>
                </div>
              </div>
            </template>
            <template #empty>
              <span class="px-2 text-xs text-[var(--text-tertiary)]">
                {{ flowsLoading ? 'Loading flows...' : 'No flows found' }}
              </span>
            </template>
          </UInputMenu>
          <div v-if="flowsLoading" class="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
            <UIcon name="lucide:loader-circle" class="h-3.5 w-3.5 animate-spin" />
            <span>Loading flows...</span>
          </div>
          <div v-if="selectedFlow" class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Selected: <span class="font-medium text-[var(--text-secondary)]">{{ selectedFlow.label }}</span>
          </div>
          <div v-else-if="flowsLoaded && !flowsLoading && flowItems.length === 0" class="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--text-tertiary)]">
            <span>No flows found.</span>
            <UButton size="xs" variant="ghost" color="primary" to="/settings/flows/create">
              Create Flow
            </UButton>
          </div>
          <div class="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">
            Use this when the event should do extra work after the socket action, such as saving the message to the database, audit logging, notifications, or webhooks. The socket event triggers the flow and does not wait for it to finish.
          </div>
        </div>
      </div>

      <div class="surface-card rounded-xl p-4 space-y-3">
        <div class="flex items-center gap-2">
          <UIcon name="lucide:braces" class="h-4 w-4 text-primary" />
          <div class="text-sm font-semibold text-[var(--text-primary)]">Payload Preview</div>
        </div>
        <pre class="max-h-[360px] overflow-auto rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 text-[11px] font-mono text-[var(--text-secondary)]">{{ JSON.stringify(samplePayload, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
