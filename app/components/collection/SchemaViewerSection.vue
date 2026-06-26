<template>
  <section
    class="overflow-hidden rounded-[var(--radius-panel)] border"
    :style="panelStyle"
  >
    <header class="flex items-center gap-2.5 px-4 py-3">
      <span :class="['accent-tile flex size-7 items-center justify-center rounded-md', tileClass]">
        <UIcon :name="icon" class="size-4" />
      </span>
      <h3 class="text-sm font-semibold text-[var(--text-primary)]">{{ title }}</h3>
      <span v-if="hint" class="ml-auto text-xs text-[var(--text-tertiary)]">{{ hint }}</span>
    </header>
    <div class="m-3 rounded-[var(--radius-subcontrol)] border border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div class="overflow-auto p-3 font-mono text-sm">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type TileKind = 'primary' | 'success' | 'warning' | 'info' | 'error' | 'neutral';

const TILE_BASE: Record<TileKind, string | null> = {
  primary: 'var(--md-primary)',
  success: 'var(--st-success)',
  warning: 'var(--st-warning)',
  info: 'var(--st-info)',
  error: 'var(--st-error)',
  neutral: null,
};

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
const panelStyle = computed(() => {
  const base = TILE_BASE[props.tile];
  if (!base) return { background: 'var(--surface-default)', borderColor: 'var(--border-default)' };
  return {
    background: `color-mix(in srgb, ${base} 8%, var(--surface-default))`,
    borderColor: `color-mix(in srgb, ${base} 26%, var(--surface-default))`,
  };
});
</script>
