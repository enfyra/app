<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  event: any;
  gatewayId: string | number;
  gatewayPath: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [];
}>();

const notify = useNotify();
const tableName = "websocket_event_definition";
const { validate, getIncludeFields, generateEmptyForm } = useSchema(tableName);
const { getIdFieldName, getId } = useDatabase();

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const formEditorRef = ref();

const testPayloadJson = ref('');
const testing = ref(false);
const testResult = ref<any>(null);
const testPayloadPlaceholder = '{\n  "text": "hello"\n}';
const showTestPanel = ref(false);

const rawTestEventName =
  computed(() =>
    form.value?.eventName ??
    (form.value as any)?.event_name ??
    form.value?.name ??
    props.event?.eventName ??
    props.event?.name ??
    Object.entries(form.value || {}).find(([k]) => k.toLowerCase() === 'eventname')?.[1] ??
    '');
const testEventName = computed(() => String(rawTestEventName.value || '').trim());
const rawTestScript = computed(() => {
  const direct =
    form.value?.handlerScript ??
    (form.value as any)?.handler_script ??
    (form.value as any)?.script ??
    (form.value as any)?.logic ??
    (form.value as any)?.code ??
    props.event?.handlerScript ??
    props.event?.script ??
    props.event?.logic ??
    '';
  if (direct) return direct;
  const byKey = Object.entries(form.value || {}).find(([k, v]) => typeof v === 'string' && k.toLowerCase().includes('script'))?.[1];
  return byKey ?? '';
});
const testScript = computed(() => String(rawTestScript.value || '').trim());
const canRunTest = computed(() => !!testEventName.value && !!testScript.value);

const {
  execute: runTest,
  pending: testPending,
  error: testError,
  data: testData,
} = useApi(() => `/admin/test/run`, {
  method: 'post',
  errorContext: 'Test WebSocket Event',
  immediate: false,
  lazy: true,
});

defineExpose({
  hasFormChanges,
});

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
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
  errorContext: "Fetch Event",
  immediate: false,
  lazy: true,
});

const {
  execute: updateEvent,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update Event",
});

const {
  execute: createEvent,
  pending: createLoading,
  error: createError,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Event",
});

watch(() => isOpen.value, async (open) => {
  if (open) {
    if (props.event && getId(props.event)) {
      await initializeForm();
      await nextTick();
      if (formEditorRef.value?.confirmChanges) {
        formEditorRef.value.confirmChanges();
      }
      hasFormChanges.value = false;
    } else {
      form.value = generateEmptyForm();
      form.value.gateway = props.gatewayId;
      errors.value = {};
      hasFormChanges.value = false;
    }
  } else {
    form.value = {};
    errors.value = {};
    hasFormChanges.value = false;
  }
});

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
  const { isValid, errors: validationErrors } = validate(form.value);

  if (!isValid) {
    errors.value = validationErrors;
    notify.error("Validation Error", "Please fill in all required fields.");
    return;
  }

  const uniqueOk = await formEditorRef.value?.validateAllUniqueFields?.();
  if (uniqueOk === false) {
    notify.error("Duplicate value", "Please verify all unique fields before saving.");
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

notify.success("Success")

  hasFormChanges.value = false;
  emit('save');
  emit('update:modelValue', false);
}

async function handleTest() {
  showTestPanel.value = true;
  if (!canRunTest.value) return;

  let payload: any = {};
  if (testPayloadJson.value?.trim()) {
    try {
      payload = JSON.parse(testPayloadJson.value);
    } catch {
      notify.error("Invalid JSON", "Test payload JSON is invalid.");
      return;
    }
  }

  const eventName = testEventName.value;
  const script = testScript.value;
  const timeoutMs = Number(form.value?.timeout || 5000);

  testing.value = true;
  testResult.value = null;
  try {
    await runTest({
      body: {
        kind: 'websocket_event',
        ...(props.gatewayPath ? { gatewayPath: props.gatewayPath } : {}),
        eventName,
        timeoutMs,
        payload,
        script,
      },
    });

    if (testError.value) {
      testResult.value = { success: false, error: testError.value.message };
      return;
    }
    testResult.value = testData.value;
  } finally {
    testing.value = false;
  }
}
</script>

<template>
  <CommonDrawer
    v-model="isOpen"
    direction="right"
    full-width
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="lucide:zap" class="w-5 h-5" />
        <span>{{ event && getId(event) ? `Edit Event: ${event.eventName || ''}` : 'Create Event' }}</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <FormEditorLazy
          ref="formEditorRef"
          v-model="form"
          v-model:errors="errors"
          @has-changed="(hasChanged) => hasFormChanges = hasChanged"
          :table-name="tableName"
          :excluded="['createdAt', 'updatedAt', 'isSystem', 'gateway']"
          :loading="loading"
        />
      </div>
    </template>

    <template #footer>
      <div class="w-full space-y-4">
        <div class="flex items-center justify-between gap-2">
          <UButton
            variant="soft"
            color="secondary"
            @click="showTestPanel = !showTestPanel"
          >
            {{ showTestPanel ? 'Hide test' : 'Test' }}
          </UButton>

          <div class="flex items-center justify-end gap-2">
          <UButton
            variant="outline"
            color="error"
            @click="isOpen = false"
          >
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
        </div>

        <div v-if="showTestPanel" class="pt-3 border-t border-[var(--border-default)]">
          <div class="surface-card rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="lucide:flask-conical" class="w-4 h-4 text-primary" />
                <div class="text-sm font-semibold text-[var(--text-primary)]">Test event handler</div>
              </div>
              <UButton
                size="sm"
                color="primary"
                variant="solid"
                :loading="testing || testPending"
                :disabled="!canRunTest"
                @click="handleTest"
              >
                Test
              </UButton>
            </div>

            <div class="text-xs text-[var(--text-tertiary)]">
              Runs the current <span class="font-mono">handlerScript</span> via <span class="font-mono">/admin/test/run</span> and returns result, logs, and emitted events.
            </div>

            <div v-if="!canRunTest" class="text-xs text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-2">
              <span v-if="!testEventName">Please fill <span class="font-mono">eventName</span> above to enable testing.</span>
              <span v-else>Please fill <span class="font-mono">handlerScript</span> above to enable testing.</span>
            </div>

            <div>
              <div class="text-xs font-medium text-[var(--text-tertiary)] mb-1">Payload (JSON)</div>
              <FormCodeEditorLazy
                v-model="testPayloadJson"
                language="json"
                height="180px"
                class="text-xs"
              />
              <div v-if="!testPayloadJson?.trim()" class="mt-1 text-[11px] text-[var(--text-tertiary)] font-mono">
                {{ testPayloadPlaceholder }}
              </div>
            </div>

            <div v-if="testResult" class="space-y-2">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="testResult.success ? 'lucide:check-circle' : 'lucide:x-circle'"
                  class="w-4 h-4"
                  :class="testResult.success ? 'text-emerald-600' : 'text-rose-600'"
                />
                <div class="text-xs font-medium" :class="testResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'">
                  {{ testResult.success ? 'Test passed' : 'Test failed' }}
                </div>
              </div>

              <div v-if="testResult.error" class="text-xs text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 p-2">
                {{ testResult.error?.message || testResult.error }}
              </div>

              <div v-if="testResult.logs?.length" class="space-y-1">
                <div class="text-xs font-medium text-[var(--text-tertiary)]">Logs</div>
                <pre class="text-[11px] font-mono rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2 overflow-auto max-h-[160px] whitespace-pre-wrap">{{ JSON.stringify(testResult.logs, null, 2) }}</pre>
              </div>

              <div v-if="testResult.emitted?.length" class="space-y-1">
                <div class="text-xs font-medium text-[var(--text-tertiary)]">Emitted</div>
                <pre class="text-[11px] font-mono rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{{ JSON.stringify(testResult.emitted, null, 2) }}</pre>
              </div>

              <div v-if="testResult.result !== undefined" class="space-y-1">
                <div class="text-xs font-medium text-[var(--text-tertiary)]">Result</div>
                <pre class="text-[11px] font-mono rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{{ JSON.stringify(testResult.result, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </CommonDrawer>
</template>
