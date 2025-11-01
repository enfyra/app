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

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div :class="(isMobile || isTablet) ? 'flex gap-1.5 justify-between flex-shrink-0' : 'flex gap-2 justify-between'">
    <UButton
      icon="i-lucide-filter"
      :variant="hasActiveFilters ? 'solid' : 'outline'"
      :color="hasActiveFilters ? 'primary' : 'neutral'"
      @click="openFilterDrawer"
      :size="(isMobile || isTablet) ? 'xs' : 'sm'"
      :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
    >
      <span v-if="!isMobile && !isTablet">{{ hasActiveFilters ? `Filtered (${filterCount})` : "Filter" }}</span>
    </UButton>

    <UButton
      icon="lucide:plus"
      variant="soft"
      color="primary"
      :size="(isMobile || isTablet) ? 'xs' : 'sm'"
      @click="openCreateDrawer"
      :disabled="disabled"
      :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
    >
      <span v-if="!isMobile && !isTablet">Add New</span>
    </UButton>
  </div>
</template>
