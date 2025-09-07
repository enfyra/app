<script setup lang="ts">
const props = defineProps<{
  hasActiveFilters: boolean;
  filterCount: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "open-filter": [];
  "open-create": [];
}>();

function openFilterDrawer() {
  emit("open-filter");
}

function openCreateDrawer() {
  emit("open-create");
}
</script>

<template>
  <div class="flex gap-2 justify-between">
    <UButton
      icon="i-lucide-filter"
      :variant="hasActiveFilters ? 'solid' : 'outline'"
      :color="hasActiveFilters ? 'primary' : 'neutral'"
      @click="openFilterDrawer"
      size="sm"
    >
      {{ hasActiveFilters ? `Filtered (${filterCount})` : "Filter" }}
    </UButton>

    <UButton
      icon="lucide:plus"
      variant="soft"
      color="primary"
      size="sm"
      @click="openCreateDrawer"
      :disabled="disabled"
    >
      Add New
    </UButton>
  </div>
</template>
