<script setup lang="ts">
import type {
  WebsocketEventDataShapeField,
  WebsocketEventDataShapeToken,
  WebsocketNativeActionConfig,
  WebsocketNativeFlowTriggerConfig,
} from '../../types/websocket-event-data-shape';

type FlowSelectItem = {
  label: string;
  value: string;
  description: string;
  icon: string;
};

const props = defineProps<{
  modelValue: WebsocketEventDataShapeField[];
  socketAction?: WebsocketNativeActionConfig | null;
  triggerFlow?: WebsocketNativeFlowTriggerConfig | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: WebsocketEventDataShapeField[]];
  'update:socketAction': [value: WebsocketNativeActionConfig | null];
  'update:triggerFlow': [value: WebsocketNativeFlowTriggerConfig | null];
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
const roomTemplate = ref('');
const userTemplate = ref('');
const emitEvent = ref('event:update');
const socketPayloadMode = ref<'all' | 'field' | 'custom'>('all');
const socketPayloadField = ref('');
const socketPayloadJson = ref('{\n  "payload": "{{ data }}"\n}');
const selectedFlowId = ref<string>();
const flowPayloadMode = ref<'all' | 'field' | 'custom'>('all');
const flowPayloadField = ref('');
const flowPayloadJson = ref('{\n  "payload": "{{ data }}"\n}');
const flowMenuOpen = ref(false);
const flowsLoaded = ref(false);
const flowSearchTerm = ref('');
const selectedToken = ref('');
let flowSearchTimer: ReturnType<typeof setTimeout> | null = null;
let isApplyingExternalValue = false;

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

const payloadModeItems = [
  {
    label: 'Entire payload',
    value: 'all',
    description: 'Use the full socket event payload.',
  },
  {
    label: 'Selected field',
    value: 'field',
    description: 'Use one declared payload field.',
  },
  {
    label: 'Custom JSON',
    value: 'custom',
    description: 'Use any JSON value, object, or array.',
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

const selectedFlowItem = computed(() => {
  if (selectedFlow.value) return selectedFlow.value;
  if (!selectedFlowId.value) return undefined;
  return {
    label: selectedFlowId.value,
    value: selectedFlowId.value,
    description: 'Selected flow',
    icon: 'lucide:workflow',
  };
});

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
const socketPayloadError = computed(() => getPayloadModeError(socketPayloadMode.value, socketPayloadField.value, socketPayloadJson.value));
const socketPayloadExpressionValue = computed(() =>
  getPayloadExpressionValue(socketPayloadMode.value, socketPayloadField.value, socketPayloadJson.value),
);
const flowPayloadError = computed(() => {
  if (!selectedFlowId.value) return '';
  return getPayloadModeError(flowPayloadMode.value, flowPayloadField.value, flowPayloadJson.value);
});
const flowPayloadExpressionValue = computed(() =>
  getPayloadExpressionValue(flowPayloadMode.value, flowPayloadField.value, flowPayloadJson.value),
);
const flowPayloadPreview = computed(() =>
  formatPreviewValue(resolvePayloadForPreview(flowPayloadExpressionValue.value)),
);
const flowTriggerPreview = computed(() => {
  if (!selectedFlowId.value) return '$flow.trigger(<select flow>, <payload>)';
  return `$flow.trigger("${selectedFlowId.value}", ${flowPayloadPreview.value})`;
});
const roomTemplateIssues = computed(() => findTemplateIssues(roomTemplate.value));
const userTemplateIssues = computed(() => findTemplateIssues(userTemplate.value));
const payloadTemplateIssues = computed(() => findPayloadTemplateIssues(socketPayloadExpressionValue.value));

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

watch(
  () => props.socketAction,
  (value) => {
    applySocketAction(value);
  },
  { immediate: true },
);

watch(
  () => props.triggerFlow,
  (value) => {
    applyTriggerFlow(value);
  },
  { immediate: true },
);

watch(
  [
    actionType,
    roomTemplate,
    userTemplate,
    emitEvent,
    socketPayloadMode,
    socketPayloadField,
    socketPayloadJson,
    selectedFlowId,
    flowPayloadMode,
    flowPayloadField,
    flowPayloadJson,
  ],
  () => {
    if (isApplyingExternalValue) return;
    emitNativeConfig();
  },
);

const actionPreview = computed(() => {
  const room = resolvedRoomPreview.value || '<room>';
  const user = resolvedUserPreview.value || '<user>';
  const event = emitEvent.value || '<event>';
  const payload = formatPreviewValue(resolvePayloadForPreview(socketPayloadExpressionValue.value));
  switch (actionType.value) {
    case 'joinRoom':
      return `$socket.join("${room}")`;
    case 'leaveRoom':
      return `$socket.leave("${room}")`;
    case 'emitToUser':
      return `$socket.emitToUser("${user}", "${event}", ${payload})`;
    case 'reply':
      return `$socket.reply("${event}", ${payload})`;
    case 'broadcast':
      return `$socket.broadcast("${event}", ${payload})`;
    case 'disconnect':
      return '$socket.disconnect()';
    default:
      return `$socket.emitToRoom("${room}", "${event}", ${payload})`;
  }
});

function appendSelectedToken(target: 'room' | 'user') {
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
}

function insertSelectedTokenIntoFlowPayload() {
  const token = selectedToken.value;
  if (!token) return;
  flowPayloadJson.value = JSON.stringify(token);
}

function useSelectedTokenAsFlowPayload() {
  const token = selectedToken.value;
  if (!token) return;
  flowPayloadMode.value = 'field';
  flowPayloadField.value = token;
}

function useSelectedTokenAsSocketPayload() {
  const token = selectedToken.value;
  if (!token) return;
  socketPayloadMode.value = 'field';
  socketPayloadField.value = token;
}

function insertSelectedTokenIntoSocketPayload() {
  const token = selectedToken.value;
  if (!token) return;
  socketPayloadJson.value = JSON.stringify(token);
}

function usePayloadSampleAsSocketPayload() {
  socketPayloadMode.value = 'custom';
  socketPayloadJson.value = JSON.stringify(samplePayload.value, null, 2);
}

function usePayloadSampleAsFlowPayload() {
  flowPayloadMode.value = 'custom';
  flowPayloadJson.value = JSON.stringify(samplePayload.value, null, 2);
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

function emitNativeConfig() {
  emit('update:socketAction', buildSocketAction());
  emit('update:triggerFlow', buildTriggerFlow());
}

function buildSocketAction(): WebsocketNativeActionConfig {
  const config: WebsocketNativeActionConfig = {
    action: actionType.value as WebsocketNativeActionConfig['action'],
  };
  if (actionNeedsRoom.value) {
    config.room = roomTemplate.value;
  }
  if (actionNeedsUser.value) {
    config.userId = userTemplate.value;
  }
  if (actionNeedsEvent.value) {
    config.event = emitEvent.value;
  }
  if (actionNeedsPayload.value) {
    config.payloadExpression = socketPayloadExpressionValue.value ?? '{{ data }}';
  }
  return config;
}

function buildTriggerFlow(): WebsocketNativeFlowTriggerConfig | null {
  if (!actionAllowsFlow.value || !selectedFlowId.value) return null;
  const payload = flowPayloadExpressionValue.value;
  if (payload === undefined) return null;
  return {
    flowId: selectedFlowId.value,
    payloadExpression: payload,
  };
}

function validate() {
  if (actionNeedsPayload.value && socketPayloadError.value) {
    return false;
  }
  if (!selectedFlowId.value) return true;
  return !flowPayloadError.value;
}

function applySocketAction(value?: WebsocketNativeActionConfig | null) {
  if (!value) return;
  isApplyingExternalValue = true;
  actionType.value = value.action || value.type || 'emitToRoom';
  roomTemplate.value = value.room || value.roomTemplate || '';
  userTemplate.value = value.userId || value.userTemplate || '';
  emitEvent.value = value.event || value.eventName || emitEvent.value;
  applySocketPayloadExpression(value.payloadExpression ?? value.payload);
  isApplyingExternalValue = false;
}

function applyTriggerFlow(value?: WebsocketNativeFlowTriggerConfig | null) {
  isApplyingExternalValue = true;
  selectedFlowId.value =
    value?.flowId == null && value?.flow == null
      ? undefined
      : String(value.flowId ?? value.flow);
  if (value) {
    applyFlowPayloadExpression(value.payloadExpression ?? value.payload);
  }
  isApplyingExternalValue = false;
}

function applyFlowPayloadExpression(value: unknown) {
  if (value == null || value === '$data') {
    flowPayloadMode.value = 'all';
    return;
  }
  if (typeof value === 'string' && value.startsWith('$data.')) {
    flowPayloadMode.value = 'field';
    flowPayloadField.value = dataPathToToken(value);
    return;
  }
  if (typeof value === 'string' && /^\{\{\s*data\.[^}]+\s*\}\}$/.test(value)) {
    flowPayloadMode.value = 'field';
    flowPayloadField.value = value;
    return;
  }
  flowPayloadMode.value = 'custom';
  flowPayloadJson.value = JSON.stringify(value, null, 2);
}

function applySocketPayloadExpression(value: unknown) {
  if (value == null || value === '$data' || value === '{{ data }}') {
    socketPayloadMode.value = 'all';
    return;
  }
  if (typeof value === 'string' && value.startsWith('$data.')) {
    socketPayloadMode.value = 'field';
    socketPayloadField.value = dataPathToToken(value);
    return;
  }
  if (typeof value === 'string' && /^\{\{\s*data\.[^}]+\s*\}\}$/.test(value)) {
    socketPayloadMode.value = 'field';
    socketPayloadField.value = value;
    return;
  }
  socketPayloadMode.value = 'custom';
  socketPayloadJson.value = JSON.stringify(value, null, 2);
}

function getPayloadModeError(mode: 'all' | 'field' | 'custom', field: string, json: string) {
  if (mode === 'field' && !field) return 'Select a payload field.';
  if (mode !== 'custom') return '';
  try {
    JSON.parse(json);
    return '';
  } catch (error: any) {
    return error?.message || 'Invalid JSON payload.';
  }
}

function getPayloadExpressionValue(mode: 'all' | 'field' | 'custom', field: string, json: string) {
  if (mode === 'field') return field || '{{ data }}';
  if (mode === 'custom') {
    try {
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }
  return '{{ data }}';
}

function dataPathToToken(path: string) {
  const normalized = path.replace(/^\$data\./, '');
  return normalized ? `{{ data.${normalized} }}` : '';
}

function formatPreviewValue(value: unknown) {
  if (value === undefined) return '<invalid payload>';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

defineExpose({
  getSocketAction: buildSocketAction,
  getTriggerFlow: buildTriggerFlow,
  validate,
});

onUnmounted(() => {
  if (flowSearchTimer) clearTimeout(flowSearchTimer);
});

function resolveTemplate(template: string) {
  return template
    .replace(/\{\{\s*data\s*\}\}/g, () => JSON.stringify(samplePayload.value))
    .replace(/\{\{\s*data\.([^}]+)\s*\}\}/g, (_, path) => {
      const normalizedPath = String(path).trim();
      const value = getPathValue(samplePayload.value, normalizedPath);
      return value == null ? `<missing:${normalizedPath}>` : String(value);
    });
}

function resolvePayloadForPreview(value: unknown): unknown {
  if (value === undefined || value === null || value === '{{ data }}' || value === '$data') {
    return samplePayload.value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '{{ data }}' || trimmed === '$data') return samplePayload.value;
    const tokenOnly = trimmed.match(/^\{\{\s*data\.([^}]+)\s*\}\}$/);
    if (tokenOnly?.[1]) return getPathValue(samplePayload.value, tokenOnly[1].trim());
    if (trimmed.startsWith('$data.')) return getPathValue(samplePayload.value, trimmed.slice(6));
    return resolveTemplate(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolvePayloadForPreview(item));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolvePayloadForPreview(item)]),
    );
  }
  return value;
}

function findTemplateIssues(template: string) {
  const issues: string[] = [];
  template.replace(/\{\{\s*data\.([^}]+)\s*\}\}/g, (_, path) => {
    const normalizedPath = String(path).trim();
    const value = getPathValue(samplePayload.value, normalizedPath);
    if (value === undefined) issues.push(normalizedPath);
    return '';
  });
  return issues;
}

function findPayloadTemplateIssues(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    return findTemplateIssues(value);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => findPayloadTemplateIssues(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => findPayloadTemplateIssues(item));
  }
  return [];
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
            <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Token helper</div>
            <USelect
              v-model="selectedToken"
              :items="tokenItems"
              value-key="value"
              placeholder="Select data field"
              class="w-full"
            />
            <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Selected tokens are inserted as <span v-pre class="font-mono">{{ data.field }}</span>.
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
          <div class="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_280px]">
            <UInput v-model="roomTemplate" class="w-full font-mono" placeholder="room:{{ data.roomId }}" />
            <USelect
              v-model="selectedToken"
              :items="tokenItems"
              value-key="value"
              placeholder="Token to use"
              class="w-full"
            />
          </div>
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Preview: <span class="font-mono">{{ resolvedRoomPreview || '-' }}</span>
          </div>
          <div v-if="roomTemplateIssues.length" class="mt-1 text-[11px] text-error">
            Missing payload field: {{ roomTemplateIssues.join(', ') }}
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
          <div class="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_280px]">
            <UInput v-model="userTemplate" class="w-full font-mono" placeholder="{{ data.targetUserId }}" />
            <USelect
              v-model="selectedToken"
              :items="tokenItems"
              value-key="value"
              placeholder="Token to use"
              class="w-full"
            />
          </div>
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Preview: <span class="font-mono">{{ resolvedUserPreview || '-' }}</span>
          </div>
          <div v-if="userTemplateIssues.length" class="mt-1 text-[11px] text-error">
            Missing payload field: {{ userTemplateIssues.join(', ') }}
          </div>
        </div>

        <div v-if="actionNeedsPayload" class="space-y-3">
          <div class="max-w-sm">
            <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Socket payload</div>
            <USelect
              v-model="socketPayloadMode"
              :items="payloadModeItems"
              value-key="value"
              class="w-full"
            />
          </div>
          <div v-if="socketPayloadMode === 'field'">
            <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Payload field</div>
              <UButton size="xs" variant="ghost" :disabled="!selectedToken" @click="useSelectedTokenAsSocketPayload">
                Use selected token
              </UButton>
            </div>
            <USelect
              v-model="socketPayloadField"
              :items="tokenItems"
              value-key="value"
              placeholder="Select data field"
              class="w-full"
            />
            <div v-if="socketPayloadError" class="mt-1 text-[11px] text-error">
              {{ socketPayloadError }}
            </div>
          </div>
          <div v-else-if="socketPayloadMode === 'custom'" class="min-w-0">
            <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Custom payload JSON</div>
              <div class="flex flex-wrap gap-1">
                <UButton size="xs" variant="soft" :disabled="!selectedToken" @click="insertSelectedTokenIntoSocketPayload">
                  Use token string
                </UButton>
                <UButton size="xs" variant="ghost" @click="usePayloadSampleAsSocketPayload">
                  Use sample
                </UButton>
              </div>
            </div>
            <FormCodeEditorLazy
              v-model="socketPayloadJson"
              language="json"
              height="160px"
              class="w-full"
            />
            <div v-if="socketPayloadError" class="mt-1 text-[11px] text-error">
              {{ socketPayloadError }}
            </div>
            <div v-else class="mt-1 text-[11px] text-[var(--text-tertiary)]">
              JSON values may contain <span v-pre class="font-mono">{{ data }}</span> or <span v-pre class="font-mono">{{ data.field }}</span> tokens.
            </div>
          </div>
          <div v-else class="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
            The socket action emits the complete event payload.
          </div>
          <div v-if="payloadTemplateIssues.length" class="mt-1 text-[11px] text-error">
            Missing payload field: {{ payloadTemplateIssues.join(', ') }}
          </div>
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
          <div v-if="selectedFlowId" class="mt-3 space-y-3">
            <div class="max-w-sm">
              <div class="mb-1 text-xs font-medium text-[var(--text-tertiary)]">Flow payload</div>
              <USelect
                v-model="flowPayloadMode"
                :items="payloadModeItems"
                value-key="value"
                class="w-full"
              />
            </div>
            <div v-if="flowPayloadMode === 'field'">
              <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs font-medium text-[var(--text-tertiary)]">Payload field</div>
                <UButton size="xs" variant="ghost" :disabled="!selectedToken" @click="useSelectedTokenAsFlowPayload">
                  Use selected token
                </UButton>
              </div>
              <USelect
                v-model="flowPayloadField"
                :items="tokenItems"
                value-key="value"
                placeholder="Select data field"
                class="w-full"
              />
              <div v-if="flowPayloadError" class="mt-1 text-[11px] text-error">
                {{ flowPayloadError }}
              </div>
            </div>
            <div v-else-if="flowPayloadMode === 'custom'" class="min-w-0">
              <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs font-medium text-[var(--text-tertiary)]">Custom payload JSON</div>
                <div class="flex flex-wrap gap-1">
                  <UButton size="xs" variant="soft" :disabled="!selectedToken" @click="insertSelectedTokenIntoFlowPayload">
                    Use token string
                  </UButton>
                  <UButton size="xs" variant="ghost" @click="usePayloadSampleAsFlowPayload">
                    Use sample
                  </UButton>
                </div>
              </div>
              <FormCodeEditorLazy
                v-model="flowPayloadJson"
                language="json"
                height="160px"
                class="w-full"
              />
              <div v-if="flowPayloadError" class="mt-1 text-[11px] text-error">
                {{ flowPayloadError }}
              </div>
              <div v-else class="mt-1 text-[11px] text-[var(--text-tertiary)]">
                JSON values may contain <span v-pre class="font-mono">{{ data }}</span> or <span v-pre class="font-mono">{{ data.field }}</span> tokens.
              </div>
            </div>
            <div v-else class="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
              The flow receives the complete socket event payload.
            </div>
          </div>
          <div class="mt-3 min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)] p-3">
            <div class="mb-1 text-xs font-semibold text-[var(--text-secondary)]">Flow preview</div>
            <div class="max-w-full whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-[var(--text-tertiary)] sm:break-words sm:text-xs">
              {{ flowTriggerPreview }}
            </div>
          </div>
          <div class="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">
            Use this when the event should do extra work after the socket action, such as saving to the database, audit logging, notifications, or webhooks. The socket event triggers the flow and does not wait for it to finish.
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
