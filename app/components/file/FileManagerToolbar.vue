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
  canUpload: boolean;
  canCreateFolder: boolean;
  canSelect: boolean;
}>();

const emit = defineEmits<{
  'update:viewMode': [mode: 'grid' | 'list'];
  upload: [];
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
  <div class="flex min-w-0 flex-col gap-3 border-b border-default p-3 md:p-4 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex min-h-10 min-w-0 items-center gap-3">
      <div class="min-w-0">
        <p class="text-sm font-medium text-highlighted">Library</p>
        <p class="text-xs text-muted">{{ folderCount }} folders · {{ fileCount }} files</p>
      </div>
    </div>

    <div class="flex min-h-8 items-center justify-between gap-3 lg:shrink-0 lg:justify-end">
      <UFieldGroup aria-label="File view">
          <UButton icon="lucide:layout-grid" aria-label="Grid view" :aria-pressed="viewMode === 'grid'" color="neutral" :variant="viewMode === 'grid' ? 'soft' : 'outline'" size="sm" :disabled="busy" square @click="emit('update:viewMode', 'grid')" />
          <UButton icon="lucide:layout-list" aria-label="List view" :aria-pressed="viewMode === 'list'" color="neutral" :variant="viewMode === 'list' ? 'soft' : 'outline'" size="sm" :disabled="busy" square @click="emit('update:viewMode', 'list')" />
      </UFieldGroup>
      <div class="flex items-center gap-2">
        <UButton v-if="canUpload" label="Upload" icon="lucide:upload" color="primary" size="sm" :disabled="busy || moveMode" @click="emit('upload')" />
        <UDropdownMenu :items="menuItems" :content="{ align: 'end' }" :ui="{ item: 'pointer-coarse:min-h-[44px]' }">
          <UButton icon="lucide:ellipsis" aria-label="Library actions" color="neutral" variant="outline" size="sm" square />
        </UDropdownMenu>
      </div>
    </div>
  </div>
</template>
