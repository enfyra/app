<template>
  <UiModernCard variant="form" :size="size" :class="className">
    <div
      v-if="title || description || $slots.header"
      class="mb-6 pb-4 border-b"
      :style="{ borderColor: 'var(--border-subtle)' }"
    >
      <slot name="header">
        <h3
          v-if="title"
          class="text-lg mb-1 font-semibold"
          :style="{ color: 'var(--text-primary)' }"
        >
          {{ title }}
        </h3>
        <p
          v-if="description"
          class="text-sm"
          :style="{ color: 'var(--text-tertiary)' }"
        >
          {{ description }}
        </p>
      </slot>
    </div>

    <!-- Form Content -->
    <slot />
  </UiModernCard>
</template>

<script setup lang="ts">

interface Props {
  title?: string;
  description?: string;
  size?: 'compact' | 'default' | 'spacious';
  className?: string;
}

withDefaults(defineProps<Props>(), {
  size: 'default',
  className: '',
});
</script>
