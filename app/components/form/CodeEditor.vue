<script setup lang="ts">
const props = defineProps<{
  modelValue?: string;
  language?: "javascript" | "vue" | "json" | "html";
  height?: string;
}>();

const emit = defineEmits(["update:modelValue", "diagnostics"]);

const initialHeight = props.height || "400px";
const currentHeight = ref(initialHeight);
const minHeight = computed(() => {
  const heightStr = initialHeight.replace(/px$/, '');
  return parseInt(heightStr) || 400;
});
const containerRef = ref<HTMLDivElement>();
const resizeHandleRef = ref<HTMLDivElement>();
const isResizing = ref(false);
const startY = ref(0);
const startHeight = ref(0);

const { customTheme, vscodeTheme } = useCodeMirrorTheme(currentHeight);
const { getLanguageExtension, getBasicSetup, enfyraSyntaxPlugin } = useCodeMirrorExtensions();
const { editorRef, createEditor, watchExtensions, destroyEditor, editorView, updateEditorSize } = useCodeMirrorEditor({
  modelValue: props.modelValue,
  language: props.language,
  height: currentHeight.value,
  emit
});

const languageExtension = computed(() => getLanguageExtension(props.language));

const extensions = computed(() => [
  ...getBasicSetup(props.language, (diags) => {
    emit("diagnostics", diags);
  }),
  languageExtension.value,
  vscodeTheme,
  customTheme.value,
  enfyraSyntaxPlugin,
]);

watch(currentHeight, () => {
  if (isResizing.value) return;
  
  if (containerRef.value) {
    containerRef.value.style.height = currentHeight.value;
  }
  nextTick(() => {
    if (editorView.value) {
      editorView.value.requestMeasure();
    }
  });
});

const resizeObserverRef = ref<ResizeObserver | null>(null);

onMounted(() => {
  createEditor(extensions.value);
  watchExtensions(extensions);
  if (containerRef.value) {
    containerRef.value.style.height = currentHeight.value;
  }
  
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.style.height = "100%";
    }
    
    if (editorRef.value && containerRef.value) {
      resizeObserverRef.value = new ResizeObserver(() => {
        if (editorView.value && !isResizing.value) {
          editorView.value.requestMeasure();
        }
      });
      resizeObserverRef.value.observe(containerRef.value);
    }
  });
});

onUnmounted(() => {
  if (resizeObserverRef.value) {
    resizeObserverRef.value.disconnect();
  }
  destroyEditor();
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});

watch(() => props.language, () => {
  emit("diagnostics", []);
});

function handleMouseDown(e: MouseEvent) {
  e.preventDefault();
  isResizing.value = true;
  startY.value = e.clientY;
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    startHeight.value = rect.height;
  }
  
  if (resizeObserverRef.value && containerRef.value) {
    resizeObserverRef.value.unobserve(containerRef.value);
  }
  
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value || !containerRef.value) return;
  
  const deltaY = e.clientY - startY.value;
  const newHeight = Math.max(minHeight.value, startHeight.value + deltaY);
  const heightStr = `${newHeight}px`;
  
  if (containerRef.value) {
    containerRef.value.style.height = heightStr;
  }
  
  if (editorRef.value) {
    editorRef.value.style.height = "100%";
  }
}

function handleMouseUp() {
  if (!containerRef.value) return;
  
  const finalHeight = containerRef.value.style.height;
  isResizing.value = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  
  if (resizeObserverRef.value && containerRef.value) {
    resizeObserverRef.value.observe(containerRef.value);
  }
  
  currentHeight.value = finalHeight;
  
  nextTick(() => {
    if (editorView.value) {
      editorView.value.requestMeasure();
    }
  });
}
</script>

<template>
  <div 
    ref="containerRef" 
    class="rounded-md overflow-hidden ring-1 ring-slate-700 relative"
    :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
  >
    <div ref="editorRef" class="codemirror-editor h-full" />
    <div
      ref="resizeHandleRef"
      @mousedown="handleMouseDown"
      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-slate-600/50 transition-colors group"
      :class="{ 'bg-slate-600/50': isResizing }"
    >
      <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
        <div class="w-12 h-0.5 bg-slate-500 group-hover:bg-slate-400 rounded-full"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.codemirror-editor {
  font-family: "Fira Code", "JetBrains Mono", monospace;
  height: 100%;
  width: 100%;
}
</style>