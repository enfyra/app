<template>
  <section :class="[className, bordered ? 'eapp-form-region' : undefined]">
    <div
      v-if="title || description || $slots.header"
      class="mb-4 md:mb-6"
    >
      <slot name="header">
        <h3
          v-if="title"
          class="text-lg mb-1 font-semibold text-[var(--text-primary)]"
        >
          {{ title }}
        </h3>
        <p
          v-if="description"
          class="text-sm text-[var(--text-tertiary)]"
        >
          {{ description }}
        </p>
      </slot>
    </div>

    <slot />
  </section>
</template>

<script setup lang="ts">

interface Props {
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  bordered?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  className: '',
  bordered: true,
});
</script>
