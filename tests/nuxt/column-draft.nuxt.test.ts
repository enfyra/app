import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ confirm: vi.fn() }))
mockNuxtImport('useConfirm', () => () => ({ confirm: mocks.confirm }))
mockNuxtImport('useSchema', () => () => ({
  ensureSchema: async () => {},
  generateEmptyForm: () => ({ name: '', type: null, options: null, defaultValue: null, isPublished: true }),
  validate: () => ({ isValid: true, errors: {} }),
}))
mockNuxtImport('useDatabase', () => () => ({
  dbType: ref('postgres'),
  isMongoDB: ref(false),
  getIdFieldName: () => 'id',
  deleteIds: (record: Record<string, unknown>) => { delete record.id },
}))
mockNuxtImport('useScreen', () => () => ({ isMobile: ref(false), isTablet: ref(false) }))

import Columns from '~/components/table/Columns.vue'

const DrawerStub = defineComponent({
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue"><slot name="body" /><button data-testid="cancel" @click="$emit(\'update:modelValue\', false)">Cancel</button></div>',
})
const EditorStub = defineComponent({
  props: { modelValue: Object },
  emits: ['update:modelValue', 'hasChanged'],
  setup(_props, { expose }) { expose({ confirmChanges() {} }) },
  template: '<button data-testid="change-name" @click="$emit(\'update:modelValue\', { ...modelValue, name: \'new_name\' }); $emit(\'hasChanged\', true)">Change name</button>',
})

async function openColumn() {
  const wrapper = await mountSuspended(Columns, {
    props: { modelValue: [{ name: 'id', type: 'int', isPrimary: true }] },
    global: { stubs: {
      CommonDrawer: DrawerStub,
      FormEditorLazy: EditorStub,
      FormCodeEditorLazy: true,
      FieldPermissionManageModal: true,
      ColumnRuleManageModal: true,
    } },
  })
  await wrapper.findAll('button').find(button => button.text() === 'Add Column')!.trigger('click')
  await flushPromises()
  return wrapper
}

describe('new column draft cancellation', () => {
  beforeEach(() => { mocks.confirm.mockReset(); mocks.confirm.mockResolvedValue(false) })

  it('closes an untouched normalized draft without a discard prompt', async () => {
    const wrapper = await openColumn()
    await wrapper.get('[data-testid="cancel"]').trigger('click')
    await flushPromises()
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="cancel"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps a changed draft open when discard is cancelled', async () => {
    const wrapper = await openColumn()
    await wrapper.get('[data-testid="change-name"]').trigger('click')
    await wrapper.get('[data-testid="cancel"]').trigger('click')
    await flushPromises()
    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="cancel"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
