import { UCheckbox } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'

export function createSelectionColumn<T>(): ColumnDef<T> {
  return {
    id: 'select',
    size: 48,
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-12 px-3 md:px-4 pointer-coarse:w-16', td: 'w-12 px-3 md:px-4 pointer-coarse:w-16' } },
    header: ({ table }) => h(UCheckbox, {
      size: 'lg',
      ui: { base: "relative rounded-sm max-lg:size-7 pointer-coarse:size-7 pointer-coarse:before:absolute pointer-coarse:before:-inset-2 pointer-coarse:before:content-['']" },
      onClick: (event: MouseEvent) => event.stopPropagation(),
      modelValue: table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false,
      'onUpdate:modelValue': (checked: unknown) => table.toggleAllPageRowsSelected(checked === true),
      'aria-label': 'Select all rows',
    }),
    cell: ({ row }) => h(UCheckbox, {
      size: 'lg',
      ui: { base: "relative rounded-sm max-lg:size-7 pointer-coarse:size-7 pointer-coarse:before:absolute pointer-coarse:before:-inset-2 pointer-coarse:before:content-['']" },
      onClick: (event: MouseEvent) => event.stopPropagation(),
      modelValue: row.getIsSelected(),
      disabled: !row.getCanSelect(),
      'onUpdate:modelValue': (checked: unknown) => row.toggleSelected(checked === true),
      'aria-label': `Select row ${row.index + 1}`,
    }),
  }
}
