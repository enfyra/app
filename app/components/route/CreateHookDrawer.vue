<template>
  <CommonDrawer
    v-model="localOpen"
    :handle="false"
    direction="right"
    class="w-full max-w-full"
  >
    <template #header>
      <h2 class="text-xl font-semibold">Create {{ hookType === 'pre' ? 'Pre' : 'Post' }}-Hook</h2>
    </template>
    <template #body>
      <div class="space-y-6">
        <CommonFormCard>
          <UForm :state="localForm" @submit="$emit('save')">
            <div class="space-y-6">
              <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div class="flex items-center gap-3">
                  <UIcon name="lucide:globe" class="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  <div>
                    <label class="text-sm font-medium text-gray-900 dark:text-white">Global Hook</label>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Apply to all routes</p>
                  </div>
                </div>
                <USwitch
                  v-model="isGlobalHook"
                  @update:model-value="handleGlobalHookToggle"
                />
              </div>
              <FormEditorLazy
                v-model="localForm"
                v-model:errors="localErrors"
                :table-name="hookType === 'pre' ? 'pre_hook_definition' : 'post_hook_definition'"
                :excluded="['route', 'isSystem']"
                mode="create"
              />
            </div>
          </UForm>
        </CommonFormCard>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="outline"
          color="neutral"
          @click="$emit('cancel')"
        >
          Cancel
        </UButton>
        <UButton
          variant="solid"
          color="primary"
          :loading="loading"
          @click="$emit('save')"
        >
          Create Hook
        </UButton>
      </div>
    </template>
  </CommonDrawer>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  form: Record<string, any>;
  errors: Record<string, string>;
  loading: boolean;
  hookType?: 'pre' | 'post';
  routeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  hookType: 'pre',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: Record<string, any>];
  'update:errors': [value: Record<string, string>];
  save: [];
  cancel: [];
}>();

const localOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const localForm = computed({
  get: () => props.form,
  set: (value) => emit('update:form', value),
});

const localErrors = computed({
  get: () => props.errors,
  set: (value) => emit('update:errors', value),
});

const currentRouteId = computed(() => {
  if (props.form?.route?.id) {
    return props.form.route.id;
  }
  return props.routeId || null;
});

const isGlobalHook = ref(false);

watch(() => props.form, (form) => {
  if (form && (form.route === null || !form.route)) {
    isGlobalHook.value = true;
  } else {
    isGlobalHook.value = false;
  }
}, { immediate: true, deep: true });

function handleGlobalHookToggle(value: boolean) {
  if (value) {
    const updatedForm = { ...localForm.value };
    updatedForm.route = null;
    emit('update:form', updatedForm);
  } else {
    const updatedForm = { ...localForm.value };
    if (currentRouteId.value) {
      updatedForm.route = { id: currentRouteId.value };
    } else {
      updatedForm.route = undefined;
    }
    emit('update:form', updatedForm);
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    emit('cancel');
    isGlobalHook.value = false;
  }
});
</script>

