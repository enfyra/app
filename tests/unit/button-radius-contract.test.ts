import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { getHeaderActionButtonProps, getHeaderActionLinkProps } from '~/utils/common/header-action-button'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('header action native props', () => {
  it('omits absent props without removing explicit false or empty labels', () => {
    expect(getHeaderActionButtonProps({})).toEqual({})
    expect(getHeaderActionLinkProps({})).toEqual({})
    expect(getHeaderActionButtonProps({ label: '', loading: false, disabled: false })).toEqual({ label: '', loading: false, disabled: false })
    expect(getHeaderActionLinkProps({ to: '/data', replace: false })).toEqual({ to: '/data', replace: false })
  })

  it('resolves reactive state and hides only the mobile label', () => {
    const loading = ref(false)
    const action = { label: computed(() => 'Save'), icon: 'lucide:save', loading, disabled: computed(() => false) }
    expect(getHeaderActionButtonProps(action, true)).toEqual({ icon: 'lucide:save', loading: false, disabled: false })
    loading.value = true
    expect(getHeaderActionButtonProps(action)).toEqual({ icon: 'lucide:save', label: 'Save', loading: true, disabled: true })
  })
})

describe('shared button radius', () => {
  it('keeps page header actions and panel header buttons on the control radius', () => {
    const button = readAppFile('app.config.ts')
    const buttonBlock = button.slice(button.indexOf('button: {'), button.indexOf('button: {') + 4500)
    expect(buttonBlock).toContain('!rounded-[var(--radius-control)]')
    expect(buttonBlock).not.toContain('"rounded-[var(--radius-control)]"')

    const headerAction = readAppFile('utils/common/header-action-button.ts')
    expect(headerAction).toContain('!rounded-[var(--radius-control)]')
    expect(headerAction).not.toContain('--radius-subcontrol')

    const css = readAppFile('assets/css/main.css')
    expect(css).not.toMatch(/\.rounded-md\s*\{[^}]*--radius-subcontrol/)
  })
})
