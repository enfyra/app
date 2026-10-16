import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import Constraints from '~/components/table/Constraints.vue'

mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn(async () => true) }))

async function mountConstraints() {
  const table = ref({
    isSystem: false, uniques: [['user', 'discount']],
    indexes: [['user'], ['discount'], ['createdAt']],
    relations: [{ propertyName: 'user', type: 'many-to-one' }, { propertyName: 'discount', type: 'many-to-one' }],
  })
  const wrapper = await mountSuspended(defineComponent({ setup: () => () => h(Constraints, {
    modelValue: table.value, columnNames: ['user', 'discount', 'createdAt', 'status'],
    'onUpdate:modelValue': (value: any) => { table.value = value },
  }) }), { global: { stubs: { UTooltip: { template: '<span><slot /></span>' } } } })
  return { wrapper, table }
}

describe('collection index controls', () => {
  it('lets the user remove the redundant relation index while marking required indexes automatic', async () => {
    const { wrapper, table } = await mountConstraints()
    try {
      const deletes = wrapper.findAll('[aria-label="Delete index"]')
      expect(deletes[0]!.attributes('disabled')).toBeUndefined()
      expect(deletes[1]!.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Automatic')
      await deletes[0]!.trigger('click')
      expect(table.value.indexes).toEqual([['discount'], ['createdAt']])
    } finally { wrapper.unmount() }
  })

  it('does not lock an unfinished new index draft when a user chooses an automatic field', async () => {
    const { wrapper, table } = await mountConstraints()
    try {
      await wrapper.get('[aria-label="Add index"]').trigger('click')
      table.value.indexes.at(-1)![0] = 'discount'
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('[aria-label="Delete index"]').at(-1)!.attributes('disabled')).toBeUndefined()
    } finally { wrapper.unmount() }
  })
})
