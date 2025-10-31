<template>
  <UiModernCard
    variant="settings"
    animated
    :class="className"
    v-bind="$attrs"
  >
    <!-- Header -->
    <div class="flex items-start gap-4 mb-4">
      <div
        v-if="$slots.icon"
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style="background: linear-gradient(135deg, #0066FF 0%, #7C3AED 100%)"
      >
        <slot name="icon" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-base mb-1" :style="{ color: 'var(--text-primary)' }">
          {{ title }}
        </h3>
        <p v-if="description" class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
          {{ description }}
        </p>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="stats && stats.length > 0" class="grid grid-cols-2 gap-3 mb-4">
      <div
        v-for="(stat, index) in stats"
        :key="index"
        class="text-center p-3 rounded-lg"
        :style="{ background: 'var(--bg-surface)' }"
      >
        <div class="text-xl font-medium" :style="{ color: 'var(--text-primary)' }">
          {{ stat.value }}
        </div>
        <div class="text-xs mt-1" :style="{ color: 'var(--text-tertiary)' }">
          {{ stat.label }}
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-if="$slots.default" class="mb-4">
      <slot />
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer"
      class="pt-4 mt-4 border-t"
      :style="{ borderColor: 'var(--border-subtle)' }"
    >
      <slot name="footer" />
    </div>
  </UiModernCard>
</template>

<script setup lang="ts">
/**
 * SETTINGS CARD - Card with icon, title, description, and actions
 *
 * Features:
 * - Gradient icon container (blue-to-purple)
 * - Optional stats grid
 * - Optional footer with actions
 * - Hover gradient overlay
 * - Animated entrance
 */

interface Stat {
  label: string;
  value: string | number;
}

interface Props {
  title: string;
  description?: string;
  stats?: Stat[];
  className?: string;
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  stats: () => [],
  className: "",
});
</script>
