<script setup lang="ts">
const props = withDefaults(defineProps<{
  titleWidth?: string;
  descriptionWidth?: string;
  chips?: string[];
  showIcon?: boolean;
  showTrailing?: boolean;
  trailingWidth?: string;
  titleOnly?: boolean;
}>(), {
  titleWidth: "w-1/3 max-w-72",
  descriptionWidth: "w-2/3 max-w-[34rem]",
  chips: () => ["w-16", "w-20", "w-24"],
  showIcon: true,
  showTrailing: true,
  trailingWidth: "w-20",
  titleOnly: false,
});
</script>

<template>
  <div class="eapp-resource-list-item pointer-events-none">
    <span
      v-if="props.showIcon"
      class="eapp-resource-list-leading skeleton-gradient skeleton-pulse-slow"
    />
    <span class="min-w-0 flex-1 space-y-2">
      <span
        class="block h-4 rounded skeleton-gradient skeleton-pulse-slow"
        :class="props.titleWidth"
      />
      <span
        v-if="!props.titleOnly"
        class="block h-3 rounded skeleton-inline skeleton-pulse-slow"
        :class="props.descriptionWidth"
      />
      <span
        v-if="!props.titleOnly && props.chips.length"
        class="flex flex-wrap gap-2"
      >
        <span
          v-for="(chip, index) in props.chips"
          :key="index"
          class="block h-5 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow"
          :class="[chip, index > 1 ? 'hidden sm:block' : '']"
        />
      </span>
    </span>
    <span
      v-if="props.showTrailing"
      class="hidden h-8 shrink-0 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block"
      :class="props.trailingWidth"
    />
  </div>
</template>
