<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null | undefined;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const enabled = ref(!!props.modelValue);
const propertyName = ref(props.modelValue ?? '');

watch(() => props.modelValue, (val) => {
  enabled.value = val != null;
  propertyName.value = val ?? '';
});

watch(enabled, (val) => {
  if (!val) {
    propertyName.value = '';
    emit('update:modelValue', null);
  }
});

watch(propertyName, (val) => {
  if (enabled.value) {
    emit('update:modelValue', val || null);
  }
});
</script>

<template>
  <div class="rounded-lg border border-[var(--border-default)] p-3 w-full">
    <div class="flex items-center justify-between">
      <div class="min-w-0">
        <div class="text-sm font-medium text-[var(--text-primary)]">Create Inverse</div>
        <div class="text-xs text-[var(--text-tertiary)]">
          Auto-create the reverse relation on the target table
        </div>
      </div>
      <USwitch
        v-model="enabled"
        :disabled="disabled"
      />
    </div>
    <div v-if="enabled" class="mt-3 w-full">
      <UFormField label="Inverse Property Name" required class="w-full">
        <UInput
          v-model="propertyName"
          placeholder="e.g. posts, comments, children"
          :disabled="disabled"
          autofocus
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>
