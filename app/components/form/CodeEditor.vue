<script setup lang="ts">
const props = defineProps<{
  modelValue?: string;
  language?: "javascript" | "vue" | "json" | "html";
  height?: string;
}>();

const emit = defineEmits(["update:modelValue", "diagnostics"]);

const { customTheme, vscodeTheme } = useCodeMirrorTheme(props.height);
const { getLanguageExtension, getBasicSetup, enfyraSyntaxPlugin } = useCodeMirrorExtensions();
const { editorRef, createEditor, watchExtensions, destroyEditor, editorView } = useCodeMirrorEditor({
  modelValue: props.modelValue,
  language: props.language,
  height: props.height,
  emit
});

const languageExtension = computed(() => getLanguageExtension(props.language));

const extensions = computed(() => [
  ...getBasicSetup(props.language, (diags) => {
    console.log('CodeEditor emitting diagnostics:', diags);
    emit("diagnostics", diags);
  }),
  languageExtension.value,
  vscodeTheme,
  customTheme.value,
  enfyraSyntaxPlugin,
]);

onMounted(() => {
  createEditor(extensions.value);
  watchExtensions(extensions);
});

onUnmounted(() => {
  destroyEditor();
});

watch(() => props.language, () => {
  console.log('Language changed, emitting empty diagnostics');
  emit("diagnostics", []);
});

watch(() => editorView.value, (view) => {
  if (view) {
    console.log('EditorView created, setting up diagnostics watch');
  }
}, { immediate: true });
</script>

<template>
  <div class="rounded-md overflow-hidden ring-1 ring-slate-700">
    <div ref="editorRef" class="codemirror-editor" />
  </div>
</template>

<style scoped>
.codemirror-editor {
  font-family: "Fira Code", "JetBrains Mono", monospace;
}
</style>