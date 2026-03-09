<template>
  <UiModernCard
    variant="form"
    :class="[
      error && 'border-rose-500/50 bg-rose-500/10',
      focused && 'border-violet-500/40 ring-2 ring-violet-500/20',
      className,
    ]"
    v-bind="$attrs"
  >
    <div v-if="title || description" class="mb-6 pb-4" style="border-bottom: 1px solid var(--glass-border);">
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
