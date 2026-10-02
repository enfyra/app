<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core';

const props = defineProps<{
  anchor: HTMLElement | null;
  active: boolean;
  selectedCount: number;
  totalCount: number;
  moveMode: boolean;
  moveCount: number;
  busy: boolean;
  deleting: boolean;
  moving: boolean;
  loading: boolean;
  canMove: boolean;
  canDelete: boolean;
  moveHereDisabled: boolean;
}>();

const emit = defineEmits<{
  clear: [];
  exitSelection: [];
  toggleAll: [];
  move: [];
  delete: [];
  moveHere: [];
  cancelMove: [];
}>();

const bounds = shallowRef({ left: 0, width: 0 });
const anchor = computed(() => props.anchor);
const selection = computed(() => props.selectedCount === 0 ? false : props.selectedCount === props.totalCount ? true : 'indeterminate' as const);

function measureAnchor() {
  if (!props.anchor) return;
  const rect = props.anchor.getBoundingClientRect();
  bounds.value = { left: rect.left + rect.width / 2, width: Math.min(rect.width, 640) };
}

useResizeObserver(anchor, measureAnchor);
useEventListener('resize', measureAnchor);
watch([anchor, () => props.active], measureAnchor, { flush: 'post' });
</script>

<template>
  <Teleport to="body">
    <Transition name="mini-pagination">
      <div
        v-if="active && bounds.width > 0"
        role="toolbar"
        :aria-label="moveMode ? 'Move selected items' : 'Selected items'"
        :style="{ left: `${bounds.left}px`, width: `${bounds.width}px` }"
        class="fixed bottom-[calc(var(--shell-overlay-inset)+0.75rem+env(safe-area-inset-bottom))] z-30 flex -translate-x-1/2 flex-col gap-3 rounded-[var(--radius-panel)] border border-default bg-default p-3 text-sm shadow-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <template v-if="moveMode">
            <p class="font-medium text-highlighted">Move {{ moveCount }} items</p>
            <p class="text-xs text-muted">Open a folder, then choose Move here.</p>
          </template>
          <UCheckbox
            v-else
            :model-value="selection"
            :label="`${selectedCount} selected`"
            description="Select items on this page"
            :disabled="busy || loading || totalCount === 0"
            :ui="{ root: 'items-center', container: 'h-auto shrink-0', base: 'size-6', icon: 'size-5', wrapper: 'ms-3 min-w-0', label: 'text-sm font-medium', description: 'text-xs' }"
            @update:model-value="emit('toggleAll')"
          />
        </div>
        <div class="flex shrink-0 items-center justify-end gap-2">
          <template v-if="moveMode">
            <UButton label="Cancel" icon="lucide:x" color="neutral" variant="outline" size="sm" :disabled="busy" @click="emit('cancelMove')" />
            <UButton label="Move here" icon="lucide:folder-input" color="primary" size="sm" :loading="moving" :disabled="moveHereDisabled || busy" @click="emit('moveHere')" />
          </template>
          <template v-else>
            <UButton icon="lucide:x" aria-label="Exit selection mode" color="neutral" variant="outline" size="sm" square :disabled="busy" @click="emit('exitSelection')" />
            <UButton label="Clear" color="neutral" variant="outline" size="sm" :disabled="busy || selectedCount === 0" @click="emit('clear')" />
            <UButton v-if="canMove" label="Move" icon="lucide:folder-input" color="neutral" variant="outline" size="sm" :disabled="busy || loading || selectedCount === 0" @click="emit('move')" />
            <UButton v-if="canDelete" label="Delete" icon="lucide:trash-2" color="error" variant="outline" size="sm" :loading="deleting" :disabled="busy || loading || selectedCount === 0" @click="emit('delete')" />
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
