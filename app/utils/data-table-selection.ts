import { UCheckbox } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'

export function createSelectionColumn<T>(): ColumnDef<T> {
  return {
    id: 'select',
    size: 48,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => h(UCheckbox, {
      size: 'lg',
      ui: { base: 'rounded-sm' },
      modelValue: table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false,
      'onUpdate:modelValue': (checked: unknown) => table.toggleAllPageRowsSelected(checked === true),
      'aria-label': 'Select all rows',
    }),
    cell: ({ row }) => h(UCheckbox, {
      size: 'lg',
      ui: { base: 'rounded-sm' },
      modelValue: row.getIsSelected(),
      disabled: !row.getCanSelect(),
      'onUpdate:modelValue': (checked: unknown) => row.toggleSelected(checked === true),
      'aria-label': `Select row ${row.index + 1}`,
    }),
  }
}

