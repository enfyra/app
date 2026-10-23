import { h } from 'vue'
import { UBadge } from '#components'
import type { SettingsTableValueColumn } from '~/types/settings-table'

export function settingsTextColumn<TRow = Record<string, unknown>>(key: string, header: string): SettingsTableValueColumn<TRow> {
  return { accessorKey: key, header, enableSorting: false,
    cell: ({ getValue }) => {
      const value = getValue()
      const text = value == null || value === '' ? '_' : String(value)
      return h('span', { class: 'inline-block max-w-[28rem] align-middle truncate', title: text === '_' ? undefined : text }, text)
    },
  }
}

export function settingsStatusColumn<TRow = Record<string, unknown>>(key = 'isEnabled', header = 'Status'): SettingsTableValueColumn<TRow> {
  return { accessorKey: key, header, enableSorting: false,
    cell: ({ getValue }) => h(UBadge, {
      label: getValue() ? 'Enabled' : 'Disabled',
      color: getValue() ? 'success' : 'neutral',
      variant: 'soft',
    }),
  }
}

export function settingsDateColumn<TRow = Record<string, unknown>>(key = 'createdAt', header = 'Created'): SettingsTableValueColumn<TRow> {
  return { accessorKey: key, header, enableSorting: false,
    cell: ({ getValue }) => {
      const value = getValue()
      if (!value) return '_'
      const date = new Date(String(value))
      return Number.isNaN(date.getTime()) ? '_' : date.toLocaleDateString()
    },
  }
}
