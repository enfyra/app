<script setup lang="ts">
const model = defineModel<string>({ default: '' });
withDefaults(defineProps<{
  placeholder?: string;
  label?: string;
  buttonLabel?: string;
  loading?: boolean;
}>(), {
  placeholder: 'Search',
  label: 'Search',
  buttonLabel: 'Search',
  loading: false,
});
const emit = defineEmits<{ search: [value: string] }>();

function submit() {
  emit('search', model.value);
}
</script>

<template>
  <form class="eapp-search-field min-w-0 w-full md:max-w-sm md:flex-1" @submit.prevent="submit">
    <UFieldGroup class="w-full" :ui="{ base: 'w-full rounded-[var(--radius-control)]' }">
      <UInput
        v-model="model"
        icon="lucide:search"
        size="sm"
        :placeholder="placeholder"
        :aria-label="label"
        class="min-w-0 flex-1"
        :ui="{ base: 'h-8 !rounded-s-[var(--radius-control)] !rounded-e-none' }"
      />
      <UButton type="submit" size="sm" color="neutral" variant="outline" :loading="loading" class="h-8 !rounded-s-none !rounded-e-[var(--radius-control)]">{{ buttonLabel }}</UButton>
    </UFieldGroup>
  </form>
</template>
