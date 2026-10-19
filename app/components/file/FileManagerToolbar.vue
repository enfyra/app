<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const props = defineProps<{
  title: string;
  description?: string;
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
const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    ...(props.canCreateFolder ? [{ label: 'New folder', icon: 'lucide:folder-plus', disabled: props.busy || props.moveMode, onSelect: () => emit('createFolder') }] : []),
    ...(props.canSelect && (totalCount.value > 0 || props.selectionMode) ? [{ label: 'Select items', icon: 'lucide:check-square', type: 'checkbox' as const, checked: props.selectionMode, disabled: props.busy || props.moveMode, onUpdateChecked: () => emit('select') }] : []),
  ],
  [{ label: 'Refresh', icon: 'lucide:refresh-cw', disabled: props.loading || props.busy, onSelect: () => emit('refresh') }],
].filter(group => group.length > 0));
</script>

<template>
  <div class="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:justify-between">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-3">
      <div class="min-w-0 max-md:basis-full">
        <h2 class="truncate text-sm font-medium text-highlighted" :title="title">{{ title }}</h2>
        <p class="mt-0.5 truncate text-xs text-muted" :title="description">{{ description }}</p>
      </div>
    </div>

    <div class="flex min-h-8 shrink-0 items-center justify-between gap-2 md:ml-auto md:justify-end">
      <div class="flex items-center gap-1.5" role="group" aria-label="File view">
        <UButton icon="lucide:layout-grid" aria-label="Grid view" :aria-pressed="viewMode === 'grid'" color="neutral" :variant="viewMode === 'grid' ? 'soft' : 'outline'" size="sm" :disabled="busy" square @click="emit('update:viewMode', 'grid')" />
        <UButton icon="lucide:layout-list" aria-label="List view" :aria-pressed="viewMode === 'list'" color="neutral" :variant="viewMode === 'list' ? 'soft' : 'outline'" size="sm" :disabled="busy" square @click="emit('update:viewMode', 'list')" />
      </div>
      <div class="flex items-center gap-2">
        <UDropdownMenu :items="menuItems" :content="{ align: 'end' }" :ui="{ item: 'pointer-coarse:min-h-[44px]' }">
          <UButton icon="lucide:ellipsis" aria-label="Library actions" color="neutral" variant="outline" size="sm" square />
        </UDropdownMenu>
      </div>
    </div>
  </div>
</template>
