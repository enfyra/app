import { h } from 'vue'
import { UBadge } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'

export function settingsTextColumn(key: string, header: string): ColumnDef<Record<string, any>> {
  return { accessorKey: key, header, enableSorting: false,
    cell: ({ getValue }) => {
      const value = getValue()
      const text = value == null || value === '' ? '_' : String(value)
      return h('span', { class: 'inline-block max-w-[28rem] align-middle truncate', title: text === '_' ? undefined : text }, text)
    },
  }
}

export function settingsStatusColumn(key = 'isEnabled', header = 'Status'): ColumnDef<Record<string, any>> {
  return { accessorKey: key, header, enableSorting: false,
    cell: ({ getValue }) => h(UBadge, {
      label: getValue() ? 'Enabled' : 'Disabled',
      color: getValue() ? 'success' : 'neutral',
      variant: 'soft',
    }),
  }
}

export function settingsDateColumn(key = 'createdAt', header = 'Created'): ColumnDef<Record<string, any>> {
  return { accessorKey: key, header, enableSorting: false,
    cell: ({ getValue }) => {
      const value = getValue()
      if (!value) return '_'
      const date = new Date(String(value))
      return Number.isNaN(date.getTime()) ? '_' : date.toLocaleDateString()
    },
  }
}
