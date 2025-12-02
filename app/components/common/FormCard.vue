<template>
  <UiModernCard variant="form" :size="size" :class="className">
    <div
      v-if="title || description || $slots.header"
      class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-800"
    >
      <slot name="header">
        <h3
          v-if="title"
          class="text-lg mb-1 font-semibold text-gray-800 dark:text-white/90"
        >
          {{ title }}
        </h3>
        <p
          v-if="description"
          class="text-sm text-gray-500 dark:text-gray-400"
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
