import { normalizeStyle } from 'vue'
import type { SettingsTableCellStyle } from '~/types/settings-table'

function stripWidth(style: string | Record<string, string> | undefined, compact: boolean): Record<string, string> {
  const result = { ...(normalizeStyle([style]) as Record<string, string> | undefined) }
  for (const key of ['width', 'minWidth', 'maxWidth', 'min-width', 'max-width']) delete result[key]
  if (compact) result.width = '1px'
  return result
}

export function contentColumnStyle<Context>(style: SettingsTableCellStyle<Context> | undefined, compact: boolean): SettingsTableCellStyle<Context> {
  if (typeof style === 'function') return context => stripWidth(style(context), compact)
  return stripWidth(style, compact)
}
