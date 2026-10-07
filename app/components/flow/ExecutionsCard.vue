<script setup lang="ts">
import { h } from 'vue';
import { UBadge } from '#components';
import type { ColumnDef } from '@tanstack/vue-table';
import { getExecutionStatusColor } from '~/utils/flow.constants';

const props = withDefaults(defineProps<{
  executions: any[];
  page?: number;
  hasNextPage: boolean;
  loading: boolean;
  showTitle?: boolean;
}>(), { showTitle: true, page: 1 });

const emit = defineEmits<{
  refresh: [];
  'update:page': [page: number];
  open: [execution: any];
}>();
const { getId } = useDatabase();
const columns: ColumnDef<Record<string, any>>[] = [
  { id: 'id', header: 'ID', enableSorting: false, accessorFn: execution => getId(execution) },
  {
    accessorKey: 'status', header: 'Status', enableSorting: false,
    cell: ({ getValue }) => h(UBadge, { label: String(getValue()), color: getExecutionStatusColor(String(getValue())), variant: 'soft' }),
  },
  { accessorKey: 'startedAt', header: 'Started', enableSorting: false, cell: ({ getValue }) => formatTime(getValue() as string | null) },
  { accessorKey: 'completedAt', header: 'Completed', enableSorting: false, cell: ({ getValue }) => formatTime(getValue() as string | null) },
  { accessorKey: 'duration', header: 'Duration', enableSorting: false, cell: ({ getValue }) => getValue() == null ? '_' : `${getValue()} ms` },
];

function formatTime(value: string | null) {
  if (!value) return '_';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-end" :class="{ 'justify-between': props.showTitle }">
      <h3 v-if="props.showTitle" class="text-lg font-semibold text-default">Recent Executions</h3>
      <UButton icon="lucide:refresh-cw" size="sm" color="neutral" variant="outline" label="Reload" :loading="loading" @click="emit('refresh')" />
    </div>
    <DataTable
      :data="executions"
      :columns="columns"
      :loading="loading"
      :get-row-id="execution => String(getId(execution))"
      :page="page"
      :pagination-config="{ mode: 'cursor', itemsPerPage: 10, hasNextPage, loading, showPageSize: false }"
      @update:page="page => emit('update:page', page)"
      @row-click="execution => emit('open', execution)"
    />
  </section>
</template>
