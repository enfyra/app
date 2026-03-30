<template>
  <UInputMenu
    :model-value="selectedItem"
    :items="tableItems"
    v-model:search-term="searchTerm"
    v-model:open="isMenuOpen"
    placeholder="Type to search table..."
    class="w-full"
    by="value"
    :loading="isLoading"
    :filter="false"
    @update:model-value="onSelect"
  >
    <template #leading>
      <UIcon name="i-lucide-database" class="w-4 h-4 text-gray-400" />
    </template>
    <template #item="{ item }">
      <div class="flex items-center gap-2 w-full">
        <UIcon name="i-lucide-table-2" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span class="text-sm truncate">{{ item.label }}</span>
      </div>
    </template>
    <template #empty>
      <span class="text-xs text-gray-400 px-2">{{ isLoading ? 'Searching...' : 'No tables found' }}</span>
    </template>
  </UInputMenu>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const searchTerm = ref('');
const isMenuOpen = ref(false);
const isLoading = ref(false);
const tables = ref<any[]>([]);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const selectedItem = computed(() => {
  if (!props.modelValue) return undefined;
  return { label: props.modelValue, value: props.modelValue };
});

const tableItems = computed(() =>
  tables.value.map((t: any) => ({ label: t.name, value: t.name }))
);

const { data: tablesData, execute: fetchTables } = useApi(
  () => {
    const params = new URLSearchParams({ fields: 'id,name', limit: '10', sort: 'name' });
    if (searchTerm.value) {
      params.set('filter', JSON.stringify({ name: { _contains: searchTerm.value } }));
    }
    return `/table_definition?${params.toString()}`;
  },
  { errorContext: 'Fetch Tables' }
);

async function loadTables() {
  isLoading.value = true;
  await fetchTables();
  tables.value = tablesData.value?.data || [];
  isLoading.value = false;
}

watch(searchTerm, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadTables(), 500);
});

watch(isMenuOpen, (open) => {
  if (open && tables.value.length === 0) loadTables();
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

function onSelect(item: any) {
  if (item?.value) {
    emit('update:modelValue', item.value);
  }
}
</script>
