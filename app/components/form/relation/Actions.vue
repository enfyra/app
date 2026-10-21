<script setup lang="ts">
defineProps<{
  hasActiveFilters: boolean;
  filterCount: number;
}>();

const emit = defineEmits<{
  "open-filter": [];
}>();

function openFilterDrawer() {
  emit("open-filter");
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
      :class="(isMobile || isTablet) ? '!aspect-square' : ''"
    >
      <span v-if="!isMobile && !isTablet">{{ hasActiveFilters ? `Filtered (${filterCount})` : "Filter" }}</span>
    </UButton>
  </div>
</template>
