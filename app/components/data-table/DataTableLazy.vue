<script setup lang="ts" generic="TRow extends object">
import type { RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table';
import type { DataTableProps } from '~/types/ui';
import type { DataTableSlots } from '~/types/data-table-columns';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<DataTableProps<TRow>>(), {
  showColumnVisibility: true,
});

defineSlots<DataTableSlots<TRow>>();
const emit = defineEmits<{
  'row-click': [row: TRow];
  'page-size-change': [size: number];
  'search': [value: string];
  'update:selectedRows': [rows: TRow[]];
  'update:selectedRowIds': [ids: (string | number)[]];
}>();

const rowSelection = defineModel<RowSelectionState>('rowSelection', { default: () => ({}) });
const sorting = defineModel<SortingState>('sorting', { default: () => [] });
const search = defineModel<string>('search', { default: '' });
const page = defineModel<number>('page', { default: 1 });
const columnVisibility = defineModel<VisibilityState>('columnVisibility', { default: () => ({}) });
const { cellSlotNames, columnSlotNames, contentSlotNames } = useDataTableSlots();
const forwardedProps = computed(() => {
  const forwarded: Partial<DataTableProps<TRow>> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined && !['rowSelection', 'sorting', 'columnVisibility', 'page', 'search'].includes(key)) Object.assign(forwarded, { [key]: value });
  }
  return { ...forwarded, data: props.data, columns: props.columns, headerName: props.headerName };
});

const DataTable = defineAsyncComponent<typeof import('./DataTable.vue')['default']>(() => import('./DataTable.vue'));
</script>

<template>
  <div v-bind="$attrs">
    <Suspense>
      <!-- @vue-generic {TRow} -->
      <DataTable
        v-bind="forwardedProps"
        v-model:row-selection="rowSelection"
        v-model:sorting="sorting"
        v-model:column-visibility="columnVisibility"
        v-model:page="page"
        v-model:search="search"
        @search="value => emit('search', value)"
        @row-click="(row) => emit('row-click', row)"
        @page-size-change="size => emit('page-size-change', size)"
        @update:selected-rows="rows => emit('update:selectedRows', rows)"
        @update:selected-row-ids="ids => emit('update:selectedRowIds', ids)"
      >
        <template v-for="name in cellSlotNames" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
        <template v-for="name in columnSlotNames" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
        <template v-for="name in contentSlotNames" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
        <template v-if="$slots.expanded" #expanded="slotData">
          <slot name="expanded" v-bind="slotData" />
        </template>
        <template v-if="$slots.toolbar" #toolbar="slotData">
          <slot name="toolbar" v-bind="slotData" />
        </template>
        <template v-if="$slots['toolbar-actions']" #toolbar-actions="slotData">
          <slot name="toolbar-actions" v-bind="slotData" />
        </template>
        <template v-if="$slots.footer" #footer="slotData">
          <slot name="footer" v-bind="slotData" />
        </template>
        <template v-if="$slots['pagination-summary']" #pagination-summary="slotData">
          <slot name="pagination-summary" v-bind="slotData" />
        </template>
      </DataTable>
    </Suspense>
  </div>
</template>
