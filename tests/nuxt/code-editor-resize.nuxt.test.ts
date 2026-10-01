import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { EditorView } from '@codemirror/view'
import { StateEffect } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useCodeMirrorEditor } from '~/composables/editor/useCodeMirrorEditor'

mockNuxtImport('useApi', () => () => ({ execute: async () => {}, pending: ref(false), error: ref(null), data: ref(null) }))
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => false }))
const theme = vi.hoisted(() => ({ value: 'light' }))
mockNuxtImport('useColorMode', () => () => ref(theme.value))

import CodeEditor from '~/components/form/CodeEditor.vue'

describe('CodeMirror resize', () => {
  it.each(['light', 'dark'])('keeps native token and template colors after dragging in %s mode', async mode => {
    theme.value = mode
    const source = 'const count = 42;\nconst label = "hello";\nconst user = @USER;'
    const wrapper = await mountSuspended(CodeEditor, { props: { modelValue: source, language: 'javascript', height: '400px', enfyraAutocomplete: true }, global: { stubs: { CommonDrawer: true } } })
    try {
      await expect.poll(() => wrapper.find('.cm-line span').exists(), { timeout: 5000 }).toBe(true)
      const keyword = () => wrapper.findAll('.cm-line span').find(span => span.text() === 'const')!
      expect(keyword()).toBeDefined()
      const initialColor = getComputedStyle(keyword().element).color
      expect(wrapper.find('.cm-enfyra-template').exists()).toBe(true)
      const body = wrapper.get('.codemirror-editor').element.parentElement!
      const container = body.parentElement!
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 100, 600, 400))
      vi.spyOn(body, 'getBoundingClientRect').mockReturnValue(new DOMRect(45, 110, 590, 384))
      await wrapper.get('[data-resize-handle]').trigger('mousedown', { clientY: 100 })
      const preview = () => document.querySelector<HTMLElement>('.fixed.border-dashed')!
      expect(preview().style.top).toBe('110px')
      expect(preview().style.left).toBe('45px')
      expect(preview().style.width).toBe('590px')
      expect(preview().style.height).toBe('384px')
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: 600 }))
      await nextTick()
      expect(preview().style.height).toBe('884px')
      document.dispatchEvent(new MouseEvent('mouseup', { clientY: 600 }))
      await nextTick()
      expect(container.style.height).toBe('900px')
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
      expect(keyword()).toBeDefined()
      expect(getComputedStyle(keyword().element).color).toBe(initialColor)
      expect(wrapper.get('.cm-enfyra-template').text()).toBe('@USER')
      expect(wrapper.get('.cm-content').text()).toContain('const count = 42;')
    } finally { wrapper.unmount() }
  }, 10000)

  it('preserves native syntax highlighting when a resized view measures and updates', async () => {
    let editor: ReturnType<typeof useCodeMirrorEditor>
    const Host = defineComponent({ setup() {
      editor = useCodeMirrorEditor({
        modelValue: 'const count = 42;\nconst label = "hello";',
        emit: () => {},
        codeMirrorModules: { EditorView, StateEffect },
      })
      onMounted(() => editor.createEditor([javascript(), syntaxHighlighting(defaultHighlightStyle)]))
      onBeforeUnmount(editor.destroyEditor)
      return () => h('div', { style: 'height:400px' }, h('div', { ref: editor.editorRef }))
    } })
    const wrapper = await mountSuspended(Host)
    try {
      const highlightedText = () => [...wrapper.element.querySelectorAll('.cm-line span')].filter(span => span.className).map(span => span.textContent)
      expect(highlightedText()).toContain('const')
      const initial = highlightedText()
      wrapper.element.setAttribute('style', 'height:600px')
      editor!.updateEditorSize()
      editor!.editorView.value.dispatch({})
      await nextTick()
      expect(highlightedText()).toEqual(initial)
      expect(editor!.editorView.value.state.doc.toString()).toContain('const count = 42;')
    } finally { wrapper.unmount() }
  })
})
