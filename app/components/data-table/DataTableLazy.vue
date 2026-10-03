<script setup lang="ts">
import type { DataTableProps } from "~/types/ui";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<DataTableProps>(), {
  showColumnVisibility: true,
});

const emit = defineEmits<{
  "row-click": [row: any];
  "page-size-change": [size: number];
  "update:rowSelection": [selection: Record<string, boolean>];
}>();

const rowSelection = computed({
  get: () => props.rowSelection ?? {},
  set: (selection: Record<string, boolean>) => emit('update:rowSelection', selection),
});
const page = defineModel<number>('page', { default: 1 });
const columnVisibility = defineModel<Record<string, boolean>>('columnVisibility', { default: () => ({}) });

const DataTable = defineAsyncComponent(() => import("./DataTable.vue"));
</script>

<template>
  <div v-bind="$attrs">
    <Suspense>
      <DataTable
        v-bind="props"
        v-model:row-selection="rowSelection"
        v-model:column-visibility="columnVisibility"
        v-model:page="page"
        @row-click="(row) => emit('row-click', row)"
        @page-size-change="size => emit('page-size-change', size)"
      >
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
      </DataTable>
    </Suspense>
  </div>
</template>
