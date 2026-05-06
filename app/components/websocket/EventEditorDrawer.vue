<script setup lang="ts">
import type {
  WebsocketEventDataShapeField,
  WebsocketNativeActionConfig,
  WebsocketNativeFlowTriggerConfig,
} from '../../types/websocket-event-data-shape';

const props = defineProps<{
  modelValue: boolean;
  event: any;
  gatewayId: string | number;
  gatewayPath: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [];
}>();

const notify = useNotify();
const tableName = 'websocket_event_definition';
const { validate, getIncludeFields, generateEmptyForm } = useSchema(tableName);
const { getIdFieldName, getId } = useDatabase();

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const dataShape = ref<WebsocketEventDataShapeField[]>([]);
const socketAction = ref<WebsocketNativeActionConfig | null>(null);
const triggerFlow = ref<WebsocketNativeFlowTriggerConfig | null>(null);
const hasFormChanges = ref(false);
const showDiscardModal = ref(false);
const initialSnapshot = ref<string | null>(null);
const formEditorRef = ref();
const dataShapeBuilderRef = ref();

defineExpose({
  hasFormChanges,
});

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit('update:modelValue', value);
      return;
    }

    handleCancel();
  },
});

const {
  data: eventData,
  pending: loading,
  execute: fetchEvent,
} = useApi(() => `/${tableName}`, {
  query: computed(() => {
    if (props.event && getId(props.event)) {
      return {
        fields: getIncludeFields(),
        filter: { [getIdFieldName()]: { _eq: getId(props.event) } },
      };
    }
    return {
      fields: getIncludeFields(),
    };
  }),
  errorContext: 'Fetch Event',
  immediate: false,
  lazy: true,
});

const {
  execute: updateEvent,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/${tableName}`, {
  method: 'patch',
  errorContext: 'Update Event',
});

const {
  execute: createEvent,
  pending: createLoading,
  error: createError,
} = useApi(() => `/${tableName}`, {
  method: 'post',
  errorContext: 'Create Event',
});

watch(
  () => isOpen.value,
  async (open) => {
    if (open) {
      if (props.event && getId(props.event)) {
        await initializeForm();
        await nextTick();
        formEditorRef.value?.confirmChanges?.();
      } else {
        form.value = generateEmptyForm();
        form.value.gateway = props.gatewayId;
        errors.value = {};
      }
      dataShape.value = createInitialDataShape(form.value);
      socketAction.value = normalizeSocketAction(form.value.socketAction);
      triggerFlow.value = normalizeTriggerFlow(form.value.triggerFlow);
      await nextTick();
      initialSnapshot.value = createSnapshot();
      hasFormChanges.value = false;
      return;
    }

    form.value = {};
    errors.value = {};
    dataShape.value = [];
    socketAction.value = null;
    triggerFlow.value = null;
    initialSnapshot.value = null;
    showDiscardModal.value = false;
    hasFormChanges.value = false;
  },
);

async function initializeForm() {
  if (!props.event) return;

  const currentEventId = getId(props.event);
  if (currentEventId) {
    await fetchEvent();
    const data = eventData.value?.data?.[0];
    if (data) {
      form.value = { ...data };
    }
    return;
  }

  form.value = { ...props.event };
}

async function handleSave() {
  if (dataShapeBuilderRef.value?.validate?.() === false) {
    notify.error('Invalid Flow Payload', 'Trigger flow payload is invalid or incomplete.');
    return;
  }

  form.value.dataShape = dataShape.value;
  form.value.socketAction = dataShapeBuilderRef.value?.getSocketAction?.() ?? socketAction.value;
  form.value.triggerFlow = dataShapeBuilderRef.value?.getTriggerFlow?.() ?? triggerFlow.value;

  const { isValid, errors: validationErrors } = validate(form.value);

  if (!isValid) {
    errors.value = validationErrors;
    notify.error('Validation Error', 'Please fill in all required fields.');
    return;
  }

  const uniqueOk = await formEditorRef.value?.validateAllUniqueFields?.();
  if (uniqueOk === false) {
    notify.error('Duplicate value', 'Please verify all unique fields before saving.');
    return;
  }

  if (props.event && getId(props.event)) {
    await updateEvent({
      id: getId(props.event),
      body: form.value,
    });

    if (updateError.value) {
      return;
    }
  } else {
    await createEvent({ body: form.value });

    if (createError.value) {
      return;
    }
  }

  notify.success('Success');

  hasFormChanges.value = false;
  emit('save');
  emit('update:modelValue', false);
}

function handleCancel() {
  const hasUnsavedChanges =
    hasFormChanges.value ||
    (props.modelValue &&
      initialSnapshot.value !== null &&
      createSnapshot() !== initialSnapshot.value);

  if (hasUnsavedChanges) {
    showDiscardModal.value = true;
    return;
  }

  emit('update:modelValue', false);
}

function confirmDiscard() {
  showDiscardModal.value = false;
  hasFormChanges.value = false;
  emit('update:modelValue', false);
}

function onDataShapeUpdate(value: WebsocketEventDataShapeField[]) {
  dataShape.value = value;
  hasFormChanges.value = createSnapshot() !== initialSnapshot.value;
}

function onSocketActionUpdate(value: WebsocketNativeActionConfig | null) {
  socketAction.value = value;
  hasFormChanges.value = createSnapshot() !== initialSnapshot.value;
}

function onTriggerFlowUpdate(value: WebsocketNativeFlowTriggerConfig | null) {
  triggerFlow.value = value;
  hasFormChanges.value = createSnapshot() !== initialSnapshot.value;
}

function createSnapshot() {
  return stableStringify({
    form: form.value,
    dataShape: dataShape.value,
    socketAction: socketAction.value,
    triggerFlow: triggerFlow.value,
  });
}

function normalizeSocketAction(value: unknown): WebsocketNativeActionConfig | null {
  if (!value || typeof value !== 'object') return null;
  return value as WebsocketNativeActionConfig;
}

function normalizeTriggerFlow(value: unknown): WebsocketNativeFlowTriggerConfig | null {
  if (!value || typeof value !== 'object') return null;
  return value as WebsocketNativeFlowTriggerConfig;
}

function createInitialDataShape(record: Record<string, any>) {
  const existing = normalizeWebsocketEventDataShape(
    record.dataShape || record.inputSchema || record.payloadSchema,
  );
  if (existing.length) return existing;
  return [
    createWebsocketEventDataShapeField({
      name: 'roomId',
      type: 'string',
      required: true,
    }),
    createWebsocketEventDataShapeField({
      name: 'eventId',
      type: 'string',
      required: true,
    }),
    createWebsocketEventDataShapeField({
      name: 'payload',
      type: 'object',
      required: true,
      children: [
        createWebsocketEventDataShapeField({
          name: 'status',
          type: 'string',
          required: false,
        }),
        createWebsocketEventDataShapeField({
          name: 'value',
          type: 'number',
          required: false,
        }),
      ],
    }),
    createWebsocketEventDataShapeField({
      name: 'timestamp',
      type: 'number',
      required: true,
    }),
  ];
}
</script>

<template>
  <CommonDrawer v-model="isOpen" direction="right" full-width>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="lucide:zap" class="h-5 w-5" />
        <span>{{ event && getId(event) ? `Edit Event: ${event.eventName || ''}` : 'Create Event' }}</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <FormEditorLazy
          ref="formEditorRef"
          v-model="form"
          v-model:errors="errors"
          :table-name="tableName"
          :excluded="[
            'createdAt',
            'updatedAt',
            'isSystem',
            'gateway',
            'sourceCode',
            'compiledCode',
            'handlerScript',
            'scriptLanguage',
            'dataShape',
            'socketAction',
            'triggerFlow',
          ]"
          :loading="loading"
          @has-changed="(hasChanged) => (hasFormChanges = hasChanged || createSnapshot() !== initialSnapshot)"
        />

        <WebsocketDataShapeBuilder
          ref="dataShapeBuilderRef"
          :model-value="dataShape"
          :socket-action="socketAction"
          :trigger-flow="triggerFlow"
          @update:model-value="onDataShapeUpdate"
          @update:socket-action="onSocketActionUpdate"
          @update:trigger-flow="onTriggerFlowUpdate"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton variant="outline" color="error" @click="handleCancel">
          Cancel
        </UButton>
        <UButton
          variant="solid"
          color="primary"
          :loading="updateLoading || createLoading"
          :disabled="!hasFormChanges || updateLoading || createLoading"
          @click="handleSave"
        >
          {{ event && getId(event) ? 'Update' : 'Create' }}
        </UButton>
      </div>
    </template>
  </CommonDrawer>

  <CommonModal v-model="showDiscardModal">
    <template #title>Discard Changes</template>
    <template #body>
      <div class="text-sm text-[var(--text-secondary)]">
        You have unsaved changes. Are you sure you want to close? All changes will be lost.
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton variant="ghost" color="error" @click="showDiscardModal = false">
          Cancel
        </UButton>
        <UButton @click="confirmDiscard">Discard Changes</UButton>
      </div>
    </template>
  </CommonModal>
</template>
