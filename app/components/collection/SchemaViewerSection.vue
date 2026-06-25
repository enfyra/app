<template>
  <section
    class="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-default)]"
  >
    <header class="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-3">
      <span :class="['accent-tile flex size-7 items-center justify-center rounded-md', tileClass]">
        <UIcon :name="icon" class="size-4" />
      </span>
      <h3 class="text-sm font-semibold text-[var(--text-primary)]">{{ title }}</h3>
      <span v-if="hint" class="ml-auto text-xs text-[var(--text-tertiary)]">{{ hint }}</span>
    </header>
    <div class="overflow-auto bg-[var(--prose-pre-bg)] font-mono text-sm">
      <div class="p-4">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type TileKind = 'primary' | 'success' | 'warning' | 'info' | 'error' | 'neutral';

const props = withDefaults(
  defineProps<{
    title: string;
    icon: string;
    tile?: TileKind;
    hint?: string;
  }>(),
  { tile: 'primary' }
);

const tileClass = computed(() => `accent-tile-${props.tile}`);
</script>
