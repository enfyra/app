import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import Columns from '~/components/table/Columns.vue'
import { useConfirm } from '~/composables/shared/useConfirm'

describe('collection column drawer', () => {
  it('does not prompt when its initially closed drawer reports a close', async () => {
    useState<Record<string, any>>('schemas:data', () => ({})).value = Object.fromEntries(
      ['enfyra_column', 'enfyra_field_permission', 'enfyra_column_rule'].map(name => [name, { definition: [] }]),
    )
    const confirmation = useConfirm()
    if (confirmation.isVisible.value) confirmation.onCancel()

    const wrapper = await mountSuspended(Columns, {
      route: '/collections/example',
      props: { modelValue: [{ id: 1, name: 'id', type: 'int', isPrimary: true }] },
    })
    await flushPromises()
    expect(confirmation.isVisible.value).toBe(false)

    wrapper.getComponent({ name: 'CommonDrawer' }).vm.$emit('update:modelValue', false)
    await nextTick()
    expect(confirmation.isVisible.value).toBe(false)
  })

  it('prompts when an open column editor has a changed draft', async () => {
    useState<Record<string, any>>('schemas:data', () => ({})).value = Object.fromEntries(
      ['enfyra_column', 'enfyra_field_permission', 'enfyra_column_rule'].map(name => [name, { definition: [] }]),
    )
    const confirmation = useConfirm()
    if (confirmation.isVisible.value) confirmation.onCancel()
    const wrapper = await mountSuspended(Columns, {
      route: '/collections/example',
      props: { modelValue: [{ id: 1, name: 'id', type: 'int', isPrimary: true }] },
    })
    await flushPromises()
    await wrapper.get('[aria-label="Edit column id"]').trigger('click')
    await nextTick()
    const editor = wrapper.findComponent({ name: 'FormEditorLazy' })
    expect(editor.exists()).toBe(true)
    editor.vm.$emit('hasChanged', true)
    await nextTick()
    wrapper.getComponent({ name: 'CommonDrawer' }).vm.$emit('update:modelValue', false)
    await nextTick()
    expect(confirmation.isVisible.value).toBe(true)
    expect(confirmation.options.value.title).toBe('Unsaved Changes')
    confirmation.onCancel()
  })
})
