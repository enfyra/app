interface UseCodeMirrorEditorOptions {
  modelValue?: string | Ref<string | undefined>;
  emit: (event: "update:modelValue" | "diagnostics", ...args: any[]) => void;
  codeMirrorModules?: any;
}

export function useCodeMirrorEditor(options: UseCodeMirrorEditorOptions) {
  const { modelValue, emit, codeMirrorModules } = options;

  const getModelValue = () => ensureString(isRef(modelValue) ? modelValue.value : modelValue);
  const code = ref(getModelValue());
  const editorRef = ref<HTMLDivElement>();
  const editorView = ref<any>();
  let updateListenerExtension: any = null;
  
  const modules = computed(() => {
    if (!codeMirrorModules) return null
    return isRef(codeMirrorModules) ? codeMirrorModules.value : codeMirrorModules
  })

  watch(
    () => getModelValue(),
    (newValue) => {
      if (code.value !== newValue) {
        code.value = newValue;
      }
    }
  );

  watch(code, (val, oldVal) => {
    if (val === oldVal) return;
    emit("update:modelValue", val);
  }, { flush: 'post' });

  let keyupHandler: (() => void) | null = null;

  function getEditorExtensions(extensions: any[]) {
    return updateListenerExtension
      ? [...extensions, updateListenerExtension]
      : extensions;
  }

  function reconfigureEditor(extensions: any[]) {
    const m = modules.value
    if (!editorView.value || !m?.StateEffect || extensions.length === 0) return
    editorView.value.dispatch({
      effects: m.StateEffect.reconfigure.of(getEditorExtensions(extensions)),
    });
    editorView.value.requestMeasure();
  }

  function createEditor(extensions: any[]) {
    const m = modules.value
    if (!m?.EditorView || !editorRef.value) return

    updateListenerExtension = m.EditorView.updateListener.of((update: any) => {
      if (update.docChanged) {
        code.value = update.state.doc.toString();
      }
    });

    editorView.value = new m.EditorView({
      doc: code.value,
      extensions: getEditorExtensions(extensions),
      parent: editorRef.value,
    });

    if (editorView.value?.dom) {
      keyupHandler = () => {
        const newCode = editorView.value?.state?.doc?.toString() || '';
        if (newCode !== code.value) {
          code.value = newCode;
        }
      };
      editorView.value.dom.addEventListener('keyup', keyupHandler);
    }

    if (editorRef.value.parentElement) {
      const parent = editorRef.value.parentElement;
      if (parent.style.height) {
        editorRef.value.style.height = parent.style.height;
      }
    }

    editorView.value?.requestMeasure();
  }

  watch(code, (newCode, oldCode) => {
    if (editorView.value) {
      const currentCode = editorView.value.state.doc.toString();
      if (currentCode !== newCode && newCode !== oldCode) {
        editorView.value.dispatch({
          changes: {
            from: 0,
            to: currentCode.length,
            insert: newCode,
          },
        });
        editorView.value.requestMeasure();
      }
    }
  });

  function destroyEditor() {
    if (keyupHandler && editorView.value?.dom) {
      editorView.value.dom.removeEventListener('keyup', keyupHandler);
      keyupHandler = null;
    }
    editorView.value?.destroy();
    editorView.value = null;
    updateListenerExtension = null;
  }

  function recreateEditor(extensions: any[]) {
    destroyEditor();
    createEditor(extensions);
  }

  function updateEditorSize() {
    if (editorView.value && editorRef.value) {
      if (editorRef.value.parentElement) {
        const parent = editorRef.value.parentElement;
        if (parent.style.height) {
          editorRef.value.style.height = "100%";
        }
      }
      editorView.value.requestMeasure();
    }
  }

  return {
    code,
    editorRef,
    editorView,
    createEditor,
    reconfigureEditor,
    recreateEditor,
    destroyEditor,
    updateEditorSize
  };
}
