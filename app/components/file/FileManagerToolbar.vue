<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const props = defineProps<{
  viewMode: 'grid' | 'list';
  folderCount: number;
  fileCount: number;
  moveMode: boolean;
  selectionMode: boolean;
  busy: boolean;
  loading: boolean;
  canCreateFolder: boolean;
  canSelect: boolean;
}>();

const emit = defineEmits<{
  'update:viewMode': [mode: 'grid' | 'list'];
  createFolder: [];
  refresh: [];
  select: [];
}>();

const totalCount = computed(() => props.folderCount + props.fileCount);
const viewOptions = [
  { value: 'grid' as const, label: 'Grid view', icon: 'lucide:layout-grid' },
  { value: 'list' as const, label: 'List view', icon: 'lucide:list' },
];
const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    ...(props.canCreateFolder ? [{ label: 'New folder', icon: 'lucide:folder-plus', disabled: props.busy || props.moveMode, onSelect: () => emit('createFolder') }] : []),
    ...(props.canSelect && (totalCount.value > 0 || props.selectionMode) ? [{ label: 'Select items', icon: 'lucide:check-square', type: 'checkbox' as const, checked: props.selectionMode, disabled: props.busy || props.moveMode, onUpdateChecked: () => emit('select') }] : []),
  ],
  [{ label: 'Refresh', icon: 'lucide:refresh-cw', disabled: props.loading || props.busy, onSelect: () => emit('refresh') }],
].filter(group => group.length > 0));
</script>

<template>
  <div class="flex min-h-8 shrink-0 items-center justify-end gap-2">
    <div
      class="flex h-8 items-center gap-0.5 rounded-[var(--radius-control)] border border-[var(--control-border)] bg-[var(--control-bg)] p-0.5"
      role="group"
      aria-label="File view"
    >
      <button
        v-for="option in viewOptions"
        :key="option.value"
        type="button"
        :aria-label="option.label"
        :aria-pressed="viewMode === option.value"
        :disabled="busy"
        :class="[
          'flex size-7 items-center justify-center rounded-[var(--radius-subcontrol)] transition-colors duration-[var(--duration-fast)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          viewMode === option.value
            ? 'bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]'
            : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
        ]"
        @click="emit('update:viewMode', option.value)"
      >
        <UIcon :name="option.icon" class="size-4" />
      </button>
    </div>
    <div class="flex items-center gap-2">
      <UDropdownMenu :items="menuItems" :content="{ align: 'end' }" :ui="{ item: 'pointer-coarse:min-h-[44px]' }">
        <UButton icon="lucide:ellipsis" aria-label="Library actions" color="neutral" variant="outline" size="sm" square />
      </UDropdownMenu>
    </div>
  </div>
</template>
