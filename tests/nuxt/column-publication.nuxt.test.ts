import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Columns from '~/components/table/Columns.vue'

const screen = vi.hoisted(() => ({ desktop: true }))
mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn(async () => true) }))
mockNuxtImport('useSchema', () => () => ({
  ensureSchema: async () => {},
  generateEmptyForm: () => ({ name: '', type: 'varchar', isPublished: true }),
  validate: () => ({ isValid: true, errors: {} }),
}))
mockNuxtImport('useDatabase', () => () => ({
  dbType: ref('postgres'), isMongoDB: ref(false), getIdFieldName: () => 'id',
  deleteIds: (record: Record<string, unknown>) => { delete record.id },
}))
mockNuxtImport('useScreen', () => () => ({
  isDesktop: ref(screen.desktop), isMobile: ref(!screen.desktop), isTablet: ref(false),
}))

const DrawerStub = defineComponent({
  props: ['modelValue', 'primaryAction'],
  template: '<div v-if="modelValue"><slot name="body" /><button v-if="primaryAction" data-testid="save-column" @click="primaryAction.onClick()">Update Column</button></div>',
})
const EditorStub = defineComponent({
  props: ['modelValue', 'fieldMap'],
  emits: ['update:modelValue'],
  setup(_props, { expose }) { expose({ confirmChanges() {}, validateAllUniqueFields: async () => true }) },
  template: '<div />',
})

async function mountColumns(isNullable: boolean | undefined = false, isPublished = true) {
  const columns = ref([{
    id: 7, name: 'payment_code', type: 'varchar', isPublished,
    ...(isNullable === undefined ? {} : { isNullable }),
  }])
  const wrapper = await mountSuspended(defineComponent({ setup: () => () => h(Columns, {
    modelValue: columns.value,
    'onUpdate:modelValue': (value: any[]) => { columns.value = value },
  }) }), {
    global: { stubs: {
      CommonDrawer: DrawerStub, FormEditorLazy: EditorStub,
      FieldPermissionManageModal: true, ColumnRuleManageModal: true, FormCodeEditorLazy: true,
      UTooltip: { template: '<span><slot /></span>' },
    } },
  })
  return { wrapper, columns }
}

beforeEach(() => { screen.desktop = true })

describe('column publication draft', () => {
  it('restores non-nullability and removes the badge when unpublish is undone before saving', async () => {
    const { wrapper, columns } = await mountColumns()
    try {
      const original = JSON.stringify(columns.value)
      expect(wrapper.text()).not.toContain('nullable')
      await wrapper.get('[aria-label="Unpublish column"]').trigger('click')
      expect(columns.value[0]).toMatchObject({ isPublished: false, isNullable: true })
      expect(wrapper.text()).toContain('nullable')
      await wrapper.get('[aria-label="Publish column"]').trigger('click')
      expect(JSON.stringify(columns.value)).toBe(original)
      expect(wrapper.text()).not.toContain('nullable')
      await wrapper.get('[aria-label="Unpublish column"]').trigger('click')
      await wrapper.get('[aria-label="Publish column"]').trigger('click')
      expect(JSON.stringify(columns.value)).toBe(original)
    } finally { wrapper.unmount() }
  })

  it('preserves an originally nullable column through repeated toggles', async () => {
    const { wrapper, columns } = await mountColumns(true)
    try {
      for (let i = 0; i < 2; i++) {
        await wrapper.get('[aria-label="Unpublish column"]').trigger('click')
        await wrapper.get('[aria-label="Publish column"]').trigger('click')
        expect(columns.value[0]).toMatchObject({ isPublished: true, isNullable: true })
      }
    } finally { wrapper.unmount() }
  })

  it('does not guess a non-nullable value for an already saved unpublished column', async () => {
    const { wrapper, columns } = await mountColumns(true, false)
    try {
      await wrapper.get('[aria-label="Publish column"]').trigger('click')
      expect(columns.value[0]).toMatchObject({ isPublished: true, isNullable: true })
    } finally { wrapper.unmount() }
  })

  it('restores an omitted nullable property without introducing a dirty field', async () => {
    const { wrapper, columns } = await mountColumns()
    try {
      delete columns.value[0]!.isNullable
      const original = JSON.stringify(columns.value)
      await wrapper.get('[aria-label="Unpublish column"]').trigger('click')
      await wrapper.get('[aria-label="Publish column"]').trigger('click')
      expect(JSON.stringify(columns.value)).toBe(original)
      expect(Object.hasOwn(columns.value[0]!, 'isNullable')).toBe(false)
    } finally { wrapper.unmount() }
  })

  it.each(['permissions', 'rules'])('retains the previous nullable value after editing %s', async kind => {
    const { wrapper, columns } = await mountColumns()
    try {
      await wrapper.get('[aria-label="Unpublish column"]').trigger('click')
      if (kind === 'permissions') {
        await wrapper.get('[aria-label="Field permissions"]').trigger('click')
        wrapper.getComponent({ name: 'FieldPermissionManageModal' }).vm.$emit('update:permissions', [{ id: 1 }])
      } else {
        await wrapper.get('[aria-label="Validation rules"]').trigger('click')
        wrapper.getComponent({ name: 'ColumnRuleManageModal' }).vm.$emit('update:rules', [{ id: 1 }])
      }
      await flushPromises()
      await wrapper.get('[aria-label="Publish column"]').trigger('click')
      expect(columns.value[0]).toMatchObject({ isPublished: true, isNullable: false })
    } finally { wrapper.unmount() }
  })

  it('retains the previous nullable value through a column drawer update', async () => {
    const { wrapper, columns } = await mountColumns()
    try {
      await wrapper.get('[aria-label="Unpublish column"]').trigger('click')
      await wrapper.get('[aria-label="Edit column payment_code"]').trigger('click')
      const editor = wrapper.getComponent(EditorStub)
      expect(editor.props('fieldMap').isNullable.disabled).toBe(true)
      editor.vm.$emit('update:modelValue', { ...editor.props('modelValue'), name: 'payment_reference' })
      await wrapper.get('[data-testid="save-column"]').trigger('click')
      await flushPromises()
      expect(columns.value[0]).toMatchObject({ name: 'payment_reference', isPublished: false, isNullable: true })
      await wrapper.get('[aria-label="Publish column"]').trigger('click')
      expect(columns.value[0]).toMatchObject({ name: 'payment_reference', isPublished: true, isNullable: false })
    } finally { wrapper.unmount() }
  })

  it('does not restore stale draft state after the parent replaces saved or reset columns', async () => {
    const { wrapper, columns } = await mountColumns()
    try {
      await wrapper.get('[aria-label="Unpublish column"]').trigger('click')
      columns.value = [{ id: 7, name: 'payment_code', type: 'varchar', isPublished: false, isNullable: true }]
      await flushPromises()
      await wrapper.get('[aria-label="Publish column"]').trigger('click')
      expect(columns.value[0]).toMatchObject({ isPublished: true, isNullable: true })
    } finally { wrapper.unmount() }
  })

  it('uses the same reversible publication behavior from the mobile action sheet', async () => {
    screen.desktop = false
    const { wrapper, columns } = await mountColumns()
    try {
      const row = wrapper.getComponent({ name: 'TableSchemaFieldItem' })
      await row.props('actions').find((action: { label: string }) => action.label === 'Unpublish column').onClick()
      await flushPromises()
      expect(columns.value[0]).toMatchObject({ isPublished: false, isNullable: true })
      await row.props('actions').find((action: { label: string }) => action.label === 'Publish column').onClick()
      await flushPromises()
      expect(columns.value[0]).toMatchObject({ isPublished: true, isNullable: false })
    } finally { wrapper.unmount() }
  })
})
