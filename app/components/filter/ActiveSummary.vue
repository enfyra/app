<script setup lang="ts">
const props = withDefaults(defineProps<{
  count: number;
  variant?: "banner" | "inline";
  clearable?: boolean;
  label?: string;
  clearLabel?: string;
}>(), {
  variant: "banner",
  clearable: true,
  clearLabel: "Clear filters",
});

const emit = defineEmits<{
  clear: [];
}>();

const isBanner = computed(() => props.variant === "banner");

const labelText = computed(() => {
  if (props.label) return props.label;
  return `${props.count} active filter${props.count === 1 ? "" : "s"}`;
});

const rootClasses = computed(() => [
  "active-filter-summary",
  isBanner.value
    ? "active-filter-summary--banner flex w-full items-center gap-3 rounded-xl px-3.5 py-3 sm:px-4"
    : "active-filter-summary--inline inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1",
]);
</script>

<template>
  <div :class="rootClasses" role="status" aria-live="polite">
    <span
      class="active-filter-summary__icon inline-flex shrink-0 items-center justify-center"
      :class="isBanner ? 'h-8 w-8 rounded-lg' : 'h-5 w-5 rounded-full'"
    >
      <UIcon name="i-lucide-filter" :class="isBanner ? 'h-4 w-4' : 'h-3 w-3'" />
    </span>

    <span
      class="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]"
      :class="isBanner ? 'text-sm' : 'text-xs'"
    >
      {{ labelText }}
    </span>

    <UButton
      v-if="clearable"
      icon="i-lucide-x"
      size="xs"
      variant="ghost"
      color="neutral"
      class="active-filter-summary__clear shrink-0"
      :aria-label="clearLabel"
      @click="emit('clear')"
    >
      <span v-if="isBanner">Clear</span>
    </UButton>
  </div>
</template>

<style scoped>
.active-filter-summary {
  color: var(--text-primary);
}

.active-filter-summary--banner {
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--ui-primary) 8%, transparent),
      color-mix(in srgb, var(--ui-info) 5%, transparent)
    ),
    var(--surface-default);
  border: 1px solid color-mix(in srgb, var(--ui-primary) 24%, var(--border-default));
  box-shadow: var(--shadow-sm), inset 0 1px 0 color-mix(in srgb, white 55%, transparent);
}

.active-filter-summary--inline {
  background: color-mix(in srgb, var(--ui-primary) 10%, var(--surface-default));
  border: 1px solid color-mix(in srgb, var(--ui-primary) 24%, var(--border-default));
}

.active-filter-summary__icon {
  color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 14%, var(--surface-default));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-primary) 20%, transparent);
}

.active-filter-summary__clear {
  color: var(--text-secondary) !important;
}

.active-filter-summary__clear:hover {
  color: var(--text-primary) !important;
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent) !important;
}

:global(.dark) .active-filter-summary--banner {
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--ui-primary) 13%, transparent),
      color-mix(in srgb, var(--ui-info) 8%, transparent)
    ),
    var(--surface-default);
  border-color: color-mix(in srgb, var(--ui-primary) 34%, var(--border-default));
  box-shadow: var(--shadow-sm), inset 0 1px 0 color-mix(in srgb, white 6%, transparent);
}

:global(.dark) .active-filter-summary--inline {
  background: color-mix(in srgb, var(--ui-primary) 16%, var(--surface-default));
  border-color: color-mix(in srgb, var(--ui-primary) 34%, var(--border-default));
}

:global(.dark) .active-filter-summary__icon {
  color: var(--brand-violet-bright);
  background: color-mix(in srgb, var(--ui-primary) 20%, var(--surface-default));
}
</style>
