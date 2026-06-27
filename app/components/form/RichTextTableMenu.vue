<script setup lang="ts">
defineProps<{
  style: { top: string; left: string } | null;
}>();

const emit = defineEmits<{
  close: [];
  addRowBefore: [];
  addRowAfter: [];
  deleteRow: [];
  addColumnBefore: [];
  addColumnAfter: [];
  deleteColumn: [];
  toggleHeaderRow: [];
  toggleHeaderColumn: [];
  mergeCells: [];
  splitCell: [];
  deleteTable: [];
}>();

const menuRef = ref<HTMLDivElement>();

function handleClickOutside(event: MouseEvent) {
  const target = event.target;
  if (menuRef.value && target instanceof window.Node && !menuRef.value.contains(target)) {
    emit("close");
  }
}

onMounted(() => {
  nextTick(() => {
    document.addEventListener("click", handleClickOutside);
  });
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="style"
      ref="menuRef"
      class="fixed z-50 bg-[var(--surface-default)] border border-[var(--border-strong)] rounded-md shadow-lg py-1 min-w-[180px]"
      :style="{ top: style.top, left: style.left, maxHeight: '300px', overflowY: 'auto' }"
      @click.stop
    >
      <div class="px-3 py-1 text-xs font-medium text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
        Table Options
      </div>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('addRowBefore')"
      >
        <Icon name="lucide:arrow-up" class="w-4 h-4" />
        Add Row Before
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('addRowAfter')"
      >
        <Icon name="lucide:arrow-down" class="w-4 h-4" />
        Add Row After
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('deleteRow')"
      >
        <Icon name="lucide:trash-2" class="w-4 h-4" />
        Delete Row
      </button>
      <div class="border-t border-[var(--border-default)] my-1"></div>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('addColumnBefore')"
      >
        <Icon name="lucide:arrow-left" class="w-4 h-4" />
        Add Column Before
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('addColumnAfter')"
      >
        <Icon name="lucide:arrow-right" class="w-4 h-4" />
        Add Column After
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('deleteColumn')"
      >
        <Icon name="lucide:trash-2" class="w-4 h-4" />
        Delete Column
      </button>
      <div class="border-t border-[var(--border-default)] my-1"></div>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('toggleHeaderRow')"
      >
        <Icon name="lucide:panel-top" class="w-4 h-4" />
        Toggle Header Row
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('toggleHeaderColumn')"
      >
        <Icon name="lucide:columns" class="w-4 h-4" />
        Toggle Header Column
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('mergeCells')"
      >
        <Icon name="lucide:combine" class="w-4 h-4" />
        Merge Cells
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] flex items-center gap-2"
        @click="emit('splitCell')"
      >
        <Icon name="lucide:square" class="w-4 h-4" />
        Split Cell
      </button>
      <div class="border-t border-[var(--border-default)] my-1"></div>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--state-danger-soft-bg-hover)] text-[var(--state-danger-soft-text)] flex items-center gap-2"
        @click="emit('deleteTable')"
      >
        <Icon name="lucide:trash" class="w-4 h-4" />
        Delete Table
      </button>
    </div>
  </Teleport>
</template>
