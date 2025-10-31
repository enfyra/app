<template>
  <UiModernCard
    variant="form"
    :class="[
      error && 'border-[var(--color-error)]/50 bg-[var(--color-error)]/5',
      focused && 'border-[#7C3AED]/50 ring-2 ring-[#7C3AED]/20',
      className,
    ]"
    v-bind="$attrs"
  >
    <div v-if="title || description" class="mb-6 pb-4 border-b" :style="{ borderColor: 'var(--border-subtle)' }">
      <h3 v-if="title" class="text-lg mb-1" :style="{ color: 'var(--text-primary)' }">
        {{ title }}
      </h3>
      <p v-if="description" class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
        {{ description }}
      </p>
    </div>
    <slot />
  </UiModernCard>
</template>

<script setup lang="ts">
/**
 * FORM CARD - Specialized card for forms and data entry
 *
 * Features:
 * - Optional title/description with divider
 * - Focus state (purple border + ring)
 * - Error state (red border + background tint)
 * - Clean, distraction-free design
 */

interface Props {
  title?: string;
  description?: string;
  error?: boolean;
  focused?: boolean;
  className?: string;
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  error: false,
  focused: false,
  className: "",
});
</script>
