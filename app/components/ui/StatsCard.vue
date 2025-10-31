<template>
  <UiModernCard
    variant="stats"
    animated
    size="compact"
    :class="className"
    v-bind="$attrs"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="text-2xl font-semibold mb-1" :style="{ color: 'var(--text-primary)' }">
          {{ value }}
        </div>
        <div class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
          {{ label }}
        </div>
        <div
          v-if="trend"
          class="text-xs mt-1"
          :style="{ color: trendColor }"
        >
          {{ trend.value }}
        </div>
      </div>
      <div
        v-if="$slots.icon"
        class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        :style="{ background: 'var(--bg-elevated)' }"
      >
        <slot name="icon" />
      </div>
    </div>
  </UiModernCard>
</template>

<script setup lang="ts">
/**
 * STATS CARD - Compact card for displaying metrics
 *
 * Features:
 * - Compact size optimized for grids
 * - Optional icon with background
 * - Trend indicator with color coding
 * - Hover lift animation
 */

interface Trend {
  value: string;
  direction: "up" | "down" | "neutral";
}

interface Props {
  label: string;
  value: string | number;
  trend?: Trend;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  trend: undefined,
  className: "",
});

const trendColor = computed(() => {
  if (!props.trend) return "var(--text-tertiary)";

  const colors = {
    up: "var(--color-success)",
    down: "var(--color-error)",
    neutral: "var(--text-tertiary)",
  };

  return colors[props.trend.direction];
});
</script>
