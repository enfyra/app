interface UseCodeMirrorEditorOptions {
  modelValue?: string;
  language?: "javascript" | "vue" | "json" | "html";
  height?: string;
  emit: (event: "update:modelValue" | "diagnostics", ...args: any[]) => void;
  codeMirrorModules?: any;
}

export function useCodeMirrorEditor(options: UseCodeMirrorEditorOptions) {
  const { modelValue, language, height, emit, codeMirrorModules } = options;

  const code = ref(ensureString(modelValue));
  const editorRef = ref<HTMLDivElement>();
  const editorView = ref<any>();
  
  // Get modules (handle both ref and direct value)
  const modules = computed(() => {
    if (!codeMirrorModules) return null
    return isRef(codeMirrorModules) ? codeMirrorModules.value : codeMirrorModules
  })

  watch(
    () => modelValue,
    (newValue) => {
      const stringValue = ensureString(newValue);
      if (code.value !== stringValue) {
        code.value = stringValue;
      }
    }
  );

  watch(code, (val) => {
    emit("update:modelValue", val);
  });

  function createEditor(extensions: any[]) {
    const m = modules.value
    if (!m?.EditorView || !editorRef.value) return
    
    editorView.value = new m.EditorView({
      doc: code.value,
      extensions: [
        ...extensions,
        m.EditorView.updateListener.of((update: any) => {
          if (update.docChanged) {
            code.value = update.state.doc.toString();
          }
        }),
      ],
      parent: editorRef.value,
    });
    
    if (editorRef.value.parentElement) {
      const parent = editorRef.value.parentElement;
      if (parent.style.height) {
        editorRef.value.style.height = parent.style.height;
      }
    }
  }

  function watchExtensions(extensions: ComputedRef<any[]>) {
    watch(
      extensions,
      (newExtensions) => {
        const m = modules.value
        if (editorView.value && m?.StateEffect) {
          editorView.value.dispatch({
            effects: m.StateEffect.reconfigure.of(newExtensions),
          });
        }
      },
      { deep: true }
    );
  }

  watch(code, (newCode) => {
    if (editorView.value) {
      const currentCode = editorView.value.state.doc.toString();
      if (currentCode !== newCode) {
        editorView.value.dispatch({
          changes: {
            from: 0,
            to: currentCode.length,
            insert: newCode,
          },
        });
      }
    }
  });

  function destroyEditor() {
    editorView.value?.destroy();
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
    watchExtensions,
    destroyEditor,
    updateEditorSize
  };
}