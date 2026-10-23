import type { ColumnDef, Row } from '@tanstack/vue-table'
import type { Ref } from 'vue'
import type { DataTableActionsConfig, DataTableColumnConfig, DataTableRowAction } from '../../app/types/data-table-columns'
import type { SettingsBulkAction, SettingsBulkDeleteOptions } from '../../app/types/settings-bulk-action'
import type { SettingsTableProps } from '../../app/types/settings-table'
import type { TablePaginationProps } from '../../app/types/table-pagination'
import { useDataTableColumns } from '../../app/composables/data-table/useDataTableColumns'
import { useDataTableActions } from '../../app/composables/data-table/useDataTableActions'
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

export function checkNormalizerContracts(value: Item | null | undefined) {
  const normalized: Item | null = ensureNotNull(value)
  const text: string = ensureString({ toJSON: () => undefined })
  // @ts-expect-error Normalization preserves nullability rather than asserting non-null.
  const nonNull: Item = ensureNotNull(value)
  return { normalized, text, nonNull }
}
