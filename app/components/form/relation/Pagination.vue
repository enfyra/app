<script setup lang="ts">
const props = defineProps<{
  canGoPrevious: boolean;
  canGoNext: boolean;
  loading: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  previous: [];
  next: [];
  apply: [];
}>();

function previous() {
  if (!props.loading && props.canGoPrevious) emit("previous");
}

function next() {
  if (!props.loading && props.canGoNext) emit("next");
}

function apply() {
  if (!props.disabled) emit("apply");
}

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div class="flex items-center justify-between">
    <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5' : 'flex items-center gap-2'">
      <UButton
        icon="i-lucide-chevron-left"
        :size="(isMobile || isTablet) ? 'sm' : 'xs'"
        :disabled="!canGoPrevious || loading"
        title="Previous records"
        :class="(isMobile || isTablet) ? '!rounded-[var(--radius-subcontrol)] !aspect-square' : ''"
        color="primary"
        @click="previous"
      >
        <span v-if="!isMobile && !isTablet">Previous</span>
      </UButton>
      <UButton
        icon="i-lucide-chevron-right"
        :size="(isMobile || isTablet) ? 'sm' : 'xs'"
        :disabled="!canGoNext || loading"
        title="Next records"
        :class="(isMobile || isTablet) ? '!rounded-[var(--radius-subcontrol)] !aspect-square' : ''"
        color="primary"
        @click="next"
      >
        <span v-if="!isMobile && !isTablet">Next</span>
      </UButton>
    </div>
    <UButton
      icon="lucide:check"
      color="primary"
      :size="(isMobile || isTablet) ? 'sm' : 'sm'"
      :disabled="disabled"
      :class="(isMobile || isTablet) ? '!rounded-[var(--radius-subcontrol)] !aspect-square' : ''"
      @click="apply"
    >
      <span v-if="!isMobile && !isTablet">Apply</span>
    </UButton>
  </div>
</template>
