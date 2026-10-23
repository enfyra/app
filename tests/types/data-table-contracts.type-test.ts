import type { ColumnDef, Row } from '@tanstack/vue-table'
import { h, type Ref } from 'vue'
import type { ComponentProps, ComponentSlots } from 'vue-component-type-helpers'
import DataTable from '../../app/components/data-table/DataTable.vue'
import DataTableLazy from '../../app/components/data-table/DataTableLazy.vue'
import SettingsTable from '../../app/components/data-table/SettingsTable.vue'
import type { DataTableProps } from '../../app/types/ui'
import type { DataTableActionsConfig, DataTableColumnConfig, DataTableRowAction, DataTableSlots } from '../../app/types/data-table-columns'
import type { SettingsBulkAction, SettingsBulkDeleteOptions } from '../../app/types/settings-bulk-action'
import type { SettingsTableProps } from '../../app/types/settings-table'
import type { TablePaginationProps } from '../../app/types/table-pagination'
import { useDataTableColumns } from '../../app/composables/data-table/useDataTableColumns'
import { useDataTableActions } from '../../app/composables/data-table/useDataTableActions'
import { useApi } from '../../app/composables/shared/useApi'
import { useSettingsBulkDelete } from '../../app/composables/data-table/useSettingsBulkDelete'
import { settingsTextColumn } from '../../app/utils/settings-table'
import { createSelectionColumn } from '../../app/utils/data-table-selection'
import { ensureNotNull, ensureString } from '../../app/utils/components/form'

type Item = { id: number; name: string; detail: { label: string } | null }
type Other = { id: string; count: number }
interface NamedRecord { id: number; name: string }

export function checkNamedRecordContracts(action: SettingsBulkAction<NamedRecord>) {
  const columns: ColumnDef<NamedRecord>[] = [settingsTextColumn('name', 'Name')]
  const props: SettingsTableProps<NamedRecord> = { headerName: 'Named records', data: [], columns, bulkAction: action }
  return props
}

export function checkColumnContracts() {
  const { buildColumn, buildActionsColumn, formatCellValue } = useDataTableColumns<Item>()
  const config: DataTableColumnConfig<Item> = {
    id: 'name', header: 'Name',
    cell: ({ row, getValue }) => {
      const original: Item = row.original
      const nativeRow: Row<Item> = row
      const value: unknown = getValue()
      // @ts-expect-error Missing record fields must not be invented by the column callback.
      row.original.missing
      // @ts-expect-error Cell values from dynamic accessor keys require narrowing.
      const text: string = getValue()
      return `${original.name}:${nativeRow.id}:${String(value)}:${text}`
    },
    formatOptions: {
      formatter: (value, row) => `${row.name}:${String(value)}`,
      badgeColor: () => 'success',
    },
  }
  const column: ColumnDef<Item> = buildColumn(config)
  const action: DataTableRowAction<Item> = { label: 'Open', icon: 'lucide:eye', onSelect: row => { row.name.toUpperCase() } }
  const actions: DataTableActionsConfig<Item> = { actions: row => row.detail ? [action] : [] }
  const actionColumn: ColumnDef<Item> = buildActionsColumn(actions)
  const textColumn: ColumnDef<Item> = settingsTextColumn<Item>('name', 'Name')
  const selection: ColumnDef<Item> = createSelectionColumn<Item>()
  // @ts-expect-error A native column preserves its original row type.
  const unrelated: ColumnDef<Other> = column
  // @ts-expect-error A badge color must be supported by the native component.
  const invalidColor: DataTableColumnConfig<Item> = { id: 'name', header: 'Name', formatOptions: { badgeColor: () => 'not-a-color' } }
  // @ts-expect-error Unsupported formatter names are rejected.
  formatCellValue('name', { id: 1, name: 'One', detail: null }, 'unsupported')
  const dynamic = useDataTableColumns().buildColumn({ id: 'unknown', header: 'Dynamic', cell: ({ row }) => {
    // @ts-expect-error Unspecified dynamic records do not grant unchecked nested field access.
    return row.original.detail.label
  } })
  return { column, actionColumn, textColumn, selection, unrelated, invalidColor, dynamic }
}

export function checkSelectionContracts(data: Ref<Item[]>, refresh: () => Promise<void>) {
  const selection = useDataTableActions('items', refresh, data)
  selection.handleSelectionChange([{ id: 1, name: 'One', detail: null }])
  // @ts-expect-error Selection must use the same row shape as its data source.
  selection.handleSelectionChange([{ id: 'wrong', count: 1 }])
  const selected: Item[] = selection.selectedRows.value
  const deletion = useSettingsBulkDelete<Item>({ path: '/items', title: 'Delete', refresh, onDeleted: rows => { rows[0]?.name.toUpperCase() } })
  // @ts-expect-error A typed bulk operation cannot accept unrelated rows.
  deletion.value.execute([{ id: 'wrong', count: 1 }])
  return selected
}

export function checkSettingsContracts(action: SettingsBulkAction<Item>) {
  const options: SettingsBulkDeleteOptions<Item> = { path: '/items', title: 'Delete', refresh: () => undefined, isEligible: row => row.id > 0 }
  const props: SettingsTableProps<Item> = { headerName: 'Items', data: [], columns: [settingsTextColumn<Item>('name', 'Name')], bulkAction: action }
  // @ts-expect-error Action row contracts cannot be mixed between settings tables.
  const unrelatedAction: SettingsBulkAction<Other> = action
  const links: TablePaginationProps = { itemsPerPage: 10, to: page => ({ path: '/items', query: { page } }) }
  // @ts-expect-error Pagination links use the native route target, not arbitrary return values.
  const invalidLink: TablePaginationProps = { itemsPerPage: 10, to: () => 42 }
  return { options, props, unrelatedAction, links, invalidLink }
}

type IsAny<T> = 0 extends (1 & T) ? true : false
type Assert<T extends true> = T
export type DataTableRowIsNotAny = Assert<IsAny<Parameters<NonNullable<DataTableProps<Item>['onSelect']>>[1]['original']> extends false ? true : false>
export type DataTableColumnIsNotAny = Assert<IsAny<DataTableProps<Item>['columns'][number]> extends false ? true : false>
export type LazyRowClickIsNotAny = Assert<IsAny<Parameters<NonNullable<ComponentProps<typeof DataTableLazy<Item>>['onRow-click']>>[0]> extends false ? true : false>

export function checkNativeTableContracts(row: Item, columns: ColumnDef<Item>[]) {
  const props: DataTableProps<Item> = {
    headerName: 'Items', data: [row], columns,
    getRowId: (original, index, parent) => `${original.id}:${index}:${parent?.original.name ?? ''}`,
    getSubRows: original => original.detail ? [original] : [],
    onSelect: (_event, nativeRow) => {
      nativeRow.original.name.toUpperCase()
      // @ts-expect-error Native row callbacks must retain the concrete record shape.
      nativeRow.original.missing
    },
    rowSelectionOptions: { enableRowSelection: nativeRow => nativeRow.original.id > 0 },
    contextMenuItems: original => [{ label: original.name, onSelect: () => {} }],
    sortingOptions: { sortingFns: { byName: (first, second) => first.original.name.localeCompare(second.original.name) } },
  }
  const componentProps: ComponentProps<typeof DataTable<Item>> = {
    ...props,
    'onRow-click': original => original.name.toUpperCase(),
    'onUpdate:selectedRows': rows => rows.forEach(original => original.name.toUpperCase()),
  }
  const lazyProps: ComponentProps<typeof DataTableLazy<Item>> = { ...componentProps }
  const settingsProps: ComponentProps<typeof SettingsTable<Item>> = { headerName: 'Items', data: [row], columns, 'onRow-click': original => original.name.toUpperCase() }
  const slots: DataTableSlots<Item> = {
    'name-cell': ({ row: nativeRow, getValue }) => {
      const value: unknown = getValue()
      // @ts-expect-error Cell slot original rows do not accept unrelated fields.
      nativeRow.original.count
      // @ts-expect-error Dynamic cell values cannot be assigned without narrowing.
      const text: string = value
      return [h('span', `${nativeRow.original.name}:${text}`)]
    },
    'name-header': ({ table }) => {
      // @ts-expect-error Header tables contain real typed records, never placeholder flags.
      table.options.data[0]?.__eappSkeletonRow
      return [h('span', table.options.data[0]?.name)]
    },
    toolbar: ({ tableApi }) => [h('span', tableApi?.getRowModel().rows[0]?.original.name)],
  }
  const lazySlots: ComponentSlots<typeof DataTableLazy<Item>> = slots
  // @ts-expect-error Placeholder objects cannot be passed as domain records.
  const placeholders: DataTableProps<Item> = { headerName: 'Items', columns, data: [{ __eappSkeletonRow: true }] }
  // @ts-expect-error Typed columns cannot be rebound to an unrelated row type.
  const otherProps: DataTableProps<Other> = props
  // @ts-expect-error Generic component row-click callbacks reject unrelated record contracts.
  const wrongCallback: ComponentProps<typeof DataTable<Item>> = { ...props, 'onRow-click': (original: Other) => original.count }
  return { componentProps, lazyProps, settingsProps, slots, lazySlots, placeholders, otherProps, wrongCallback }
}

export async function checkSingleAndBatchTableDeletion() {
  const single = useApi<Item>('/items', { method: 'delete' })
  const batch = useApi<Item>('/items', { method: 'delete', batch: true })
  const singleIsNotAny: Assert<IsAny<Awaited<ReturnType<typeof single.execute>>> extends false ? true : false> = true
  const batchIsNotAny: Assert<IsAny<NonNullable<Awaited<ReturnType<typeof batch.execute>>>[number]> extends false ? true : false> = true
  const unknownResult = await useApi('/items').execute()
  // @ts-expect-error Unvalidated responses do not grant unchecked domain record access.
  unknownResult.name
  const one: Item | null = await single.execute({ id: 1 })
  const many: Item[] | null = await batch.execute({ ids: [1, 2] })
  // @ts-expect-error A default single request does not silently accept ids batches.
  single.execute({ ids: [1, 2] })
  // @ts-expect-error Explicit batches require the batch identifier contract.
  batch.executeWithResult({ id: 1 })
  // @ts-expect-error Batches cannot execute without ids or files.
  batch.executeWithResult()
  // @ts-expect-error Batch results remain arrays, not individual records.
  const wrong: Item | null = await batch.execute({ ids: [1] })
  return { one, many, wrong, singleIsNotAny, batchIsNotAny }
}

export function checkNormalizerContracts(value: Item | null | undefined) {
  const normalized: Item | null = ensureNotNull(value)
  const text: string = ensureString({ toJSON: () => undefined })
  // @ts-expect-error Normalization preserves nullability rather than asserting non-null.
  const nonNull: Item = ensureNotNull(value)
  return { normalized, text, nonNull }
}
