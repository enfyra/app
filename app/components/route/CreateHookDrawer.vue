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
            <FormEditorLazy
              v-model="localForm"
              v-model:errors="localErrors"
              :table-name="hookType === 'pre' ? 'pre_hook_definition' : 'post_hook_definition'"
              :excluded="['route', 'isSystem']"
              mode="create"
            />
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

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    emit('cancel');
  }
});
</script>

