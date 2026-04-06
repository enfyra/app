<script setup lang="ts">
const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: any];
}>();

const { schemas } = useSchema();
const { getId } = useDatabase();

const items = computed(() =>
  Object.values(schemas.value).map((schema: any) => ({
    label: schema.name,
    value: getId(schema),
  }))
);

const resolvedValue = computed(() => {
  const mv = props.modelValue;
  if (mv == null) return null;
  if (typeof mv === 'object') return mv.id ?? mv._id ?? null;
  return mv;
});

const selectedItem = computed(() =>
  items.value.find((i) => String(i.value) === String(resolvedValue.value))
);

function onSelect(item: any) {
  if (item?.value) {
    emit("update:modelValue", item.value);
  }
}
</script>

<template>
  <UInputMenu
    :model-value="selectedItem"
    :items="items"
    placeholder="Search table..."
    class="w-full"
    by="value"
    @update:model-value="onSelect"
  >
    <template #leading>
      <UIcon name="lucide:database" class="w-4 h-4 text-muted-foreground" />
    </template>
    <template #item="{ item }">
      <div class="flex items-center gap-2 w-full">
        <UIcon name="lucide:table-2" class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span class="text-sm truncate">{{ item.label }}</span>
      </div>
    </template>
    <template #empty>
      <span class="text-xs text-muted-foreground px-2">No tables found</span>
    </template>
  </UInputMenu>
</template>
