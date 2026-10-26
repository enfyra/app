<script setup lang="ts">
const props = defineProps<{
  modelValue?: unknown;
  routeId: string | number;
  disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, string | number>[]] }>();
const { getId, getIdFieldName } = useDatabase();
const { data, pending, execute } = useApi<{ data: { id?: string | number; _id?: string; method?: { name?: string } }[] }>('/enfyra_route_method_config', {
  query: computed(() => ({
    fields: 'id,available,method.name', limit: 0,
    filter: { route: { _eq: props.routeId }, available: { _eq: true } },
  })),
  immediate: false,
  errorContext: 'Fetch Route Operations',
});
watch(() => props.routeId, () => { void execute(); }, { immediate: true });
const selected = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : [])
  .map(item => typeof item === 'object' && item !== null ? getId(item) : item)
  .filter(id => typeof id === 'string' || typeof id === 'number')
  .map(String));
const items = computed(() => (data.value?.data ?? []).map(operation => ({
  label: operation.method?.name ?? String(getId(operation)), value: String(getId(operation)), id: getId(operation),
})));
function update(ids: string[]) {
  emit('update:modelValue', ids.map(value => ({ [getIdFieldName()]: items.value.find(item => item.value === value)?.id ?? value })));
}
</script>

<template>
  <UInputMenu
    :model-value="selected"
    :items="items"
    value-key="value"
    multiple
    :loading="pending"
    :disabled="disabled"
    placeholder="Select route operations"
    @update:model-value="update"
  />
</template>
