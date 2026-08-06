<script setup lang="ts">
const props = withDefaults(defineProps<{
  sections?: number;
  rowsPerSection?: number;
}>(), {
  sections: 3,
  rowsPerSection: 3,
});
</script>

<template>
  <div class="space-y-6 py-2" aria-busy="true" aria-label="Loading detail">
    <div class="eapp-surface-card eapp-radius-panel border eapp-divider space-y-3 p-4">
      <div class="h-4 w-28 rounded skeleton-gradient skeleton-pulse-slow" />
      <div class="h-20 w-full rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow" />
    </div>

    <div class="space-y-2">
      <div
        v-for="row in 3"
        :key="row"
        class="eapp-surface-card eapp-radius-subcontrol flex items-center justify-between gap-4 border eapp-divider p-4"
      >
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-4 w-40 rounded skeleton-gradient skeleton-pulse-slow" />
          <div class="h-3 w-2/3 max-w-[32rem] rounded skeleton-inline skeleton-pulse-slow" />
        </div>
        <div class="h-6 w-11 shrink-0 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-for="section in props.sections"
        :key="section"
        class="eapp-surface-card eapp-radius-panel border eapp-divider p-4"
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <div class="h-5 w-36 rounded skeleton-gradient skeleton-pulse-slow" />
          <div class="h-8 w-24 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow" />
        </div>
        <div class="eapp-resource-list eapp-resource-list-plain eapp-resource-list-loading">
          <div
            v-for="row in props.rowsPerSection"
            :key="row"
            class="eapp-resource-list-item eapp-resource-list-item-loading pointer-events-none"
          >
            <span class="eapp-resource-list-leading skeleton-gradient skeleton-pulse-slow" />
            <span class="min-w-0 flex-1 space-y-2">
              <span class="block h-4 w-1/3 max-w-72 rounded skeleton-gradient skeleton-pulse-slow" />
              <span class="block h-3 w-2/3 max-w-[34rem] rounded skeleton-inline skeleton-pulse-slow" />
            </span>
            <span class="hidden h-8 w-20 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
