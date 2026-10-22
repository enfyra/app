import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import Constraints from '~/components/table/Constraints.vue'

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn(async () => true) }))
mockNuxtImport('useConfirm', () => () => ({ confirm }))

async function mountConstraints(overrides: Partial<{ isSystem: boolean; uniques: string[][]; indexes: string[][] }> = {}) {
  const table = ref({
    isSystem: false, uniques: [['user', 'discount']],
    indexes: [['user'], ['discount'], ['createdAt']],
    relations: [{ propertyName: 'user', type: 'many-to-one' }, { propertyName: 'discount', type: 'many-to-one' }],
    ...overrides,
  })
  const wrapper = await mountSuspended(defineComponent({ setup: () => () => h(Constraints, {
    modelValue: table.value, columnNames: ['user', 'discount', 'createdAt', 'status'],
    'onUpdate:modelValue': (value: any) => { table.value = value },
  }) }))
  return { wrapper, table }
}

beforeEach(() => {
  confirm.mockClear()
  confirm.mockResolvedValue(true)
})

describe('collection index controls', () => {
  it('keeps redundant indexes editable and moves automatic indexes to a read-only disclosure', async () => {
    const { wrapper, table } = await mountConstraints()
    try {
      const deletes = wrapper.findAll('[aria-label="Delete index"]')
      expect(deletes).toHaveLength(1)
      expect(deletes[0]!.attributes('disabled')).toBeUndefined()
      const automatic = wrapper.get('details')
      expect(automatic.attributes('open')).toBeUndefined()
      expect(automatic.get('summary').text()).toContain('Automatic indexes')
      expect(automatic.get(':scope > div').classes().some(value => /^p[trblxyse]?-/.test(value))).toBe(false)
      expect(automatic.findAll('code').map(item => item.text())).toEqual(['discount', 'createdAt'])
      expect(automatic.findAll('button, select, [role="combobox"]')).toHaveLength(0)
      await deletes[0]!.trigger('click')
      expect(table.value.indexes).toEqual([['discount'], ['createdAt']])
    } finally { wrapper.unmount() }
  })

  it('does not lock a new index draft when a user selects an automatic field', async () => {
    const { wrapper, table } = await mountConstraints()
    try {
      await wrapper.get('[aria-label="Add index"]').trigger('click')
      wrapper.findAllComponents({ name: 'UInputMenu' }).at(-1)!.vm.$emit('update:modelValue', ['discount'])
      await flushPromises()
      expect(table.value.indexes.at(-1)).toEqual(['discount'])
      const draft = wrapper.findAll('[aria-label="Delete index"]').at(-1)!
      expect(draft.attributes('disabled')).toBeUndefined()
      await draft.trigger('click')
      expect(table.value.indexes).toEqual([['user'], ['discount'], ['createdAt']])
    } finally { wrapper.unmount() }
  })

  it('uses one chip picker per group without repeated group headings or field action buttons', async () => {
    const { wrapper } = await mountConstraints({ indexes: [['status', 'user']] })
    try {
      const group = wrapper.get('[role="group"][aria-label="Index 1"]')
      expect(group.findAll('[role="combobox"]')).toHaveLength(1)
      expect(group.findAll('[data-slot="tagsItemText"]').map(item => item.text())).toEqual(['1 status', '2 user'])
      expect(group.findAll('[aria-label="Add field to index"], [aria-label="Remove field from index"]')).toHaveLength(0)
      expect(group.text()).not.toContain('Index 1')
      expect(group.text()).not.toContain('2 fields')
      expect(group.findAll('[aria-label="Delete index"]')).toHaveLength(1)
      expect(wrapper.find('.eapp-bordered-region').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('edits the correct group after automatic indexes without replacing its identity', async () => {
    const { wrapper, table } = await mountConstraints({ indexes: [['createdAt'], ['status']] })
    try {
      const originalGroup = table.value.indexes[1]
      const picker = wrapper.findAllComponents({ name: 'UInputMenu' }).at(-1)!
      picker.vm.$emit('update:modelValue', ['status', 'user'])
      await flushPromises()
      expect(table.value.indexes).toEqual([['createdAt'], ['status', 'user']])
      expect(table.value.indexes[1]).toBe(originalGroup)
      await wrapper.get('[aria-label="Index 1"]').findAll('[data-slot="tagsItemDelete"]')[1]!.trigger('click')
      expect(table.value.indexes).toEqual([['createdAt'], ['status']])
      await wrapper.get('[aria-label="Delete index"]').trigger('click')
      expect(table.value.indexes).toEqual([['createdAt']])
    } finally { wrapper.unmount() }
  })

  it('appends selected fields in click order through the native picker', async () => {
    const { wrapper, table } = await mountConstraints({ uniques: [], indexes: [['status']] })
    try {
      const input = wrapper.get('[role="combobox"]')
      await input.trigger('focus')
      await input.trigger('keydown', { key: 'ArrowDown' })
      await flushPromises()
      const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(item => item.textContent?.trim() === 'user')
      expect(option).toBeDefined()
      option!.click()
      await flushPromises()
      expect(table.value.indexes).toEqual([['status', 'user']])
      expect(wrapper.findAll('[data-slot="tagsItemText"]').map(item => item.text())).toEqual(['1 status', '2 user'])
    } finally { wrapper.unmount() }
  })

  it('keeps an empty group editable when the final chip is removed', async () => {
    const { wrapper, table } = await mountConstraints({ uniques: [], indexes: [['status']] })
    try {
      await wrapper.get('[data-slot="tagsItemDelete"]').trigger('click')
      expect(table.value.indexes).toEqual([['']])
      expect(wrapper.get('[role="combobox"]').attributes('placeholder')).toBe('Select fields…')
      expect(wrapper.find('[aria-label="Delete index"]').exists()).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('preserves unique chip editing and confirms group deletion', async () => {
    const { wrapper, table } = await mountConstraints({ uniques: [['status']], indexes: [] })
    try {
      wrapper.findComponent({ name: 'UInputMenu' }).vm.$emit('update:modelValue', ['status', 'user'])
      await flushPromises()
      expect(table.value.uniques).toEqual([['status', 'user']])
      await wrapper.findAll('[data-slot="tagsItemDelete"]')[1]!.trigger('click')
      expect(table.value.uniques).toEqual([['status']])
      confirm.mockResolvedValueOnce(false)
      await wrapper.get('[aria-label="Delete unique constraint"]').trigger('click')
      expect(table.value.uniques).toEqual([['status']])
      await wrapper.get('[aria-label="Delete unique constraint"]').trigger('click')
      expect(table.value.uniques).toEqual([])
      expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove Unique Constraint' }))
    } finally { wrapper.unmount() }
  })

  it('keeps a canceled index deletion in the draft', async () => {
    const { wrapper, table } = await mountConstraints({ indexes: [['status']] })
    try {
      confirm.mockResolvedValueOnce(false)
      await wrapper.get('[aria-label="Delete index"]').trigger('click')
      expect(table.value.indexes).toEqual([['status']])
    } finally { wrapper.unmount() }
  })

  it('shows unique coverage inline without disabling removal of the redundant index', async () => {
    const { wrapper } = await mountConstraints()
    try {
      expect(wrapper.text()).toContain('Covered by a unique constraint')
      const coverage = wrapper.get('[aria-label="View unique constraint coverage"]')
      expect(coverage.attributes('aria-expanded')).toBe('false')
      await coverage.trigger('click')
      expect(coverage.attributes('aria-expanded')).toBe('true')
      expect(wrapper.text()).toContain('user, discount')
      expect(wrapper.get('[aria-label="Delete index"]').attributes('disabled')).toBeUndefined()
    } finally { wrapper.unmount() }
  })

  it('shows duplicate warnings as readable text for both constraint kinds', async () => {
    const { wrapper } = await mountConstraints({ uniques: [['status'], ['status']], indexes: [['discount', 'user'], ['discount', 'user']] })
    try {
      expect(wrapper.text()).toContain('This combination already exists in another unique constraint.')
      expect(wrapper.text()).toContain('This combination already exists in another index.')
    } finally { wrapper.unmount() }
  })

  it('shows empty states and creates groups without submitting a form', async () => {
    const { wrapper, table } = await mountConstraints({ uniques: [], indexes: [] })
    try {
      expect(wrapper.text()).toContain('No unique constraints')
      expect(wrapper.text()).toContain('No custom indexes')
      expect(wrapper.find('details').exists()).toBe(false)
      await wrapper.get('[aria-label="Add unique constraint"]').trigger('click')
      await wrapper.get('[aria-label="Add index"]').trigger('click')
      expect(table.value.uniques).toEqual([['']])
      expect(table.value.indexes).toEqual([['']])
      expect(wrapper.findAll('[role="combobox"]')).toHaveLength(2)
      expect(wrapper.findAll('button').every(button => button.attributes('type') === 'button')).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('disables mutation controls, chip removal and field search for system collections', async () => {
    const { wrapper, table } = await mountConstraints({ isSystem: true, indexes: [['status', 'user']] })
    try {
      const controls = wrapper.findAll('button, input')
      expect(controls.length).toBeGreaterThan(0)
      expect(controls.every(control => control.attributes('disabled') !== undefined || control.attributes('aria-disabled') === 'true')).toBe(true)
      wrapper.findComponent({ name: 'UInputMenu' }).vm.$emit('update:modelValue', ['createdAt'])
      await flushPromises()
      expect(table.value.uniques).toEqual([['user', 'discount']])
    } finally { wrapper.unmount() }
  })
})
