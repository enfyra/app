<script setup lang="ts">
import type { ScriptLanguage } from '~/types/script-contract';
import { normalizeScriptLanguage } from '~/utils/script-contract';

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
const hasFormChanges = ref(false);
const showDiscardModal = ref(false);
const initialSnapshot = ref<string | null>(null);
const formEditorRef = ref();
const scriptLanguageOptions = [
  { label: 'javascript', value: 'javascript' },
  { label: 'typescript', value: 'typescript' },
];

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
        form.value.scriptLanguage = 'typescript';
        form.value.sourceCode = createDefaultEventSourceCode();
        form.value.compiledCode = null;
        errors.value = {};
      }
      normalizeEventScriptFields();
      await nextTick();
      initialSnapshot.value = createSnapshot();
      hasFormChanges.value = false;
      return;
    }

    form.value = {};
    errors.value = {};
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
  if (!String(form.value.sourceCode || '').trim()) {
    errors.value.sourceCode = 'sourceCode is required.';
    notify.error('Validation Error', 'Please provide an event handler script.');
    return;
  }
  form.value.scriptLanguage = normalizeScriptLanguage(form.value.scriptLanguage);

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

function updateSourceCode(value: string) {
  form.value.sourceCode = value === '' ? null : value;
  form.value.compiledCode = null;
  hasFormChanges.value = createSnapshot() !== initialSnapshot.value;
}

function updateScriptLanguage(value: unknown) {
  form.value.scriptLanguage = normalizeScriptLanguage(value);
  form.value.compiledCode = null;
  hasFormChanges.value = createSnapshot() !== initialSnapshot.value;
}

function normalizeEventScriptFields() {
  form.value.scriptLanguage = normalizeScriptLanguage(form.value.scriptLanguage);
  form.value.sourceCode =
    form.value.sourceCode === undefined ? null : form.value.sourceCode;
  form.value.compiledCode = form.value.compiledCode ?? null;
}

function createSnapshot() {
  return stableStringify({
    form: form.value,
  });
}

function createDefaultEventSourceCode() {
  return `const data = $ctx.$data || {};

$ctx.$socket.reply('event:received', data);`;
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
          ]"
          :loading="loading"
          @has-changed="(hasChanged) => (hasFormChanges = hasChanged || createSnapshot() !== initialSnapshot)"
        />

        <div class="surface-card rounded-xl p-4 space-y-4">
          <div>
            <h3 class="text-base font-semibold text-[var(--text-primary)]">Event Handler Script</h3>
            <p class="text-sm text-[var(--text-secondary)]">
              Runs inline on the socket gateway. Use <span class="font-mono">@SOCKET</span>, <span class="font-mono">@DATA</span>, <span class="font-mono">@USER</span>, <span class="font-mono">@TRIGGER</span>, and <span class="font-mono">#table_name</span>.
            </p>
          </div>

          <UFormField label="sourceCode" :error="errors.sourceCode" class="w-full">
            <FormCodeEditorLazy
              :model-value="String(form.sourceCode || '')"
              :language="normalizeScriptLanguage(form.scriptLanguage)"
              :enfyra-autocomplete="true"
              :test-run="false"
              height="420px"
              class="w-full"
              @update:model-value="updateSourceCode"
            />
            <template #hint>
              <span>Return is optional. Emit replies or broadcasts explicitly in code.</span>
            </template>
          </UFormField>

          <UFormField label="scriptLanguage" required class="w-full">
            <FormEnumPicker
              :model-value="normalizeScriptLanguage(form.scriptLanguage)"
              :options="scriptLanguageOptions"
              required
              size="sm"
              layout="inline"
              @update:model-value="updateScriptLanguage"
            />
            <template #hint>
              <span>Language used by sourceCode before server compilation.</span>
            </template>
          </UFormField>
        </div>
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
