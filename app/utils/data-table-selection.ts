import { UCheckbox } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'
import type { SelectionColumnOptions } from '~/types/data-table-columns'

export function createSelectionColumn<T>(options: SelectionColumnOptions = {}): ColumnDef<T> {
  const multiple = options.multiple !== false
  return {
    id: 'select',
    size: 48,
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-px ps-3 pe-1 md:w-12 md:px-4', td: 'w-px ps-3 pe-1 md:w-12 md:px-4' } },
    header: multiple
      ? ({ table }) => h(UCheckbox, {
        size: 'lg',
        ui: { base: "relative rounded-sm max-lg:size-7 pointer-coarse:size-7 pointer-coarse:before:absolute pointer-coarse:before:-inset-2 pointer-coarse:before:content-['']" },
        onClick: (event: MouseEvent) => event.stopPropagation(),
        modelValue: table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false,
        'onUpdate:modelValue': (checked: unknown) => table.toggleAllPageRowsSelected(checked === true),
        'aria-label': 'Select all rows',
      })
      : '',
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
