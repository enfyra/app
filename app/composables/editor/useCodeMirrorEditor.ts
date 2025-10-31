import { EditorView } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";

interface UseCodeMirrorEditorOptions {
  modelValue?: string;
  language?: "javascript" | "vue" | "json" | "html";
  height?: string;
  emit: (event: "update:modelValue" | "diagnostics", ...args: any[]) => void;
}

export function useCodeMirrorEditor(options: UseCodeMirrorEditorOptions) {
  const { modelValue, language, height, emit } = options;

  const code = ref(ensureString(modelValue));
  const editorRef = ref<HTMLDivElement>();
  const editorView = ref<EditorView>();

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
    if (editorRef.value) {
      editorView.value = new EditorView({
        doc: code.value,
        extensions: [
          ...extensions,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              code.value = update.state.doc.toString();
            }
          }),
        ],
        parent: editorRef.value,
      });
    }
  }

  function watchExtensions(extensions: ComputedRef<any[]>) {
    watch(
      extensions,
      (newExtensions) => {
        if (editorView.value) {
          editorView.value.dispatch({
            effects: StateEffect.reconfigure.of(newExtensions),
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

  return {
    code,
    editorRef,
    editorView,
    createEditor,
    watchExtensions,
    destroyEditor
  };
}