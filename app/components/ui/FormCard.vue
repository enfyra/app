<template>
  <UiModernCard
    variant="form"
    :class="[
      error && 'border-error-500/50 bg-error-50 dark:bg-error-500/10',
      focused && 'border-brand-500/50 ring-2 ring-brand-500/20',
      className,
    ]"
    v-bind="$attrs"
  >
    <div v-if="title || description" class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
      <h3 v-if="title" class="text-lg mb-1 font-semibold text-gray-800 dark:text-white/90">
        {{ title }}
      </h3>
      <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400">
        {{ description }}
      </p>
    </div>
    <slot />
  </UiModernCard>
</template>

<script setup lang="ts">

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
