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
const previewLayerRef = ref<HTMLDivElement>();
const isResizing = ref(false);
const startY = ref(0);
const startHeight = ref(0);
const previewStyle = ref<{ top: string; left: string; width: string; height: string } | null>(null);

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
  document.removeEventListener("mouseleave", handleMouseUp);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "";
  }
});

watch(() => props.language, () => {
  emit("diagnostics", []);
});

function handleMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  startY.value = e.clientY;
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    startHeight.value = rect.height;
    
    previewStyle.value = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    };
  }
  
  if (resizeObserverRef.value && containerRef.value) {
    resizeObserverRef.value.unobserve(containerRef.value);
  }
  
  document.addEventListener("mousemove", handleMouseMove, { passive: false });
  document.addEventListener("mouseup", handleMouseUp, { passive: false });
  document.addEventListener("mouseleave", handleMouseUp, { passive: false });
  
  if (resizeHandleRef.value) {
    resizeHandleRef.value.style.userSelect = "none";
  }
  
  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "none";
  }
  
  document.body.style.userSelect = "none";
  document.body.style.cursor = "ns-resize";
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value || !containerRef.value) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const deltaY = e.clientY - startY.value;
  const newHeight = Math.max(minHeight.value, startHeight.value + deltaY);
  const heightStr = `${newHeight}px`;
  
  const rect = containerRef.value.getBoundingClientRect();
  previewStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: heightStr
  };
}

function handleMouseUp(e?: MouseEvent) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  if (!containerRef.value) return;
  
  const finalHeight = previewStyle.value?.height || currentHeight.value;
  isResizing.value = false;
  previewStyle.value = null;
  
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mouseleave", handleMouseUp);
  
  if (resizeHandleRef.value) {
    resizeHandleRef.value.style.userSelect = "";
  }
  
  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "";
  }
  
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
  
  if (resizeObserverRef.value && containerRef.value) {
    resizeObserverRef.value.observe(containerRef.value);
  }
  
  currentHeight.value = finalHeight;
  
  if (containerRef.value) {
    containerRef.value.style.height = finalHeight;
  }
  
  if (editorRef.value) {
    editorRef.value.style.height = "100%";
  }
  
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
    :class="!isResizing ? 'transition-[height] duration-300 ease-out' : ''"
    :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
  >
    <div ref="editorRef" class="codemirror-editor h-full" />
    
    <!-- Preview Layer -->
    <Teleport to="body">
      <div
        v-if="isResizing && previewStyle"
        ref="previewLayerRef"
        class="fixed pointer-events-none z-50 border-2 border-dashed border-brand-500 dark:border-brand-400 bg-brand-500/5 rounded-md"
        :style="previewStyle"
      ></div>
    </Teleport>
    
    <div
      ref="resizeHandleRef"
      @mousedown="handleMouseDown"
      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-slate-600/50 transition-colors group z-50 select-none"
      :class="{ 'bg-slate-600/50': isResizing }"
      style="touch-action: none; pointer-events: auto;"
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