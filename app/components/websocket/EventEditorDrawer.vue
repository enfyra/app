<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  event: any;
  gatewayId: string | number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [];
}>();

const toast = useToast();
const tableName = "websocket_event_definition";
const { validate, getIncludeFields, generateEmptyForm } = useSchema(tableName);
const { getIdFieldName, getId } = useDatabase();

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const formEditorRef = ref();

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
    toast.add({
      title: "Validation Error",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  if (props.event && getId(props.event)) {
    await updateEvent({
      id: getId(props.event),
      body: form.value,
    });

    if (updateError.value) {
      toast.add({
        title: "Error",
        description: updateError.value.message || "Failed to update event",
        color: "error",
      });
      return;
    }
  } else {
    await createEvent({ body: form.value });

    if (createError.value) {
      toast.add({
        title: "Error",
        description: createError.value.message || "Failed to create event",
        color: "error",
      });
      return;
    }
  }

  toast.add({
    title: "Success",
    color: "success",
    description: props.event && getId(props.event) ? "Event updated!" : "Event created!",
  });

  hasFormChanges.value = false;
  emit('save');
  emit('update:modelValue', false);
}
</script>

<template>
  <CommonDrawer
    v-model="isOpen"
    direction="right"
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
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          @click="isOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          variant="solid"
          color="primary"
          :loading="updateLoading || createLoading"
          :disabled="!hasFormChanges"
          @click="handleSave"
        >
          {{ event && getId(event) ? 'Update' : 'Create' }}
        </UButton>
      </div>
    </template>
  </CommonDrawer>
</template>
