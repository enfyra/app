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

// Lazy load CodeMirror
const { initCodeMirror, codeMirrorModules, loading: loadingCodeMirror } = useCodeMirrorLazy()

const colorMode = useColorMode();

// Initialize theme composable (can be called early, it will wait for modules)
const { themeCompartment, themeExtensions } = useCodeMirrorTheme(currentHeight, codeMirrorModules);

// Initialize editor composable (can be called early)
const { code, editorRef, createEditor, watchExtensions, destroyEditor, editorView, updateEditorSize } = useCodeMirrorEditor({
  modelValue: props.modelValue,
  language: props.language,
  height: currentHeight.value,
  emit,
  codeMirrorModules: codeMirrorModules
});

// Initialize extensions composable - pass ref so it's reactive
const { getLanguageExtension, getBasicSetup, enfyraSyntaxPlugin } = useCodeMirrorExtensions(codeMirrorModules)

const languageExtension = computed(() => {
  if (!codeMirrorModules.value) return null
  return getLanguageExtension(props.language)
});

const extensions = computed(() => {
  if (!codeMirrorModules.value || !themeCompartment.value) return []
  
  const setup = getBasicSetup(props.language, (diags: any[]) => {
    emit("diagnostics", diags);
  })
  
  // Safety check: ensure setup is valid array
  if (!Array.isArray(setup) || setup.length === 0) {
    return []
  }
  
  const exts = [...setup]
  
  if (languageExtension.value) {
    exts.push(languageExtension.value)
  }
  
  if (themeExtensions.value.length > 0) {
    exts.push(themeCompartment.value.of(themeExtensions.value))
  }
  
  if (enfyraSyntaxPlugin?.value) {
    exts.push(enfyraSyntaxPlugin.value)
  }
  
  return exts
});


// Watch for theme changes and update theme compartment
watch(() => colorMode.value, () => {
  if (editorView.value && themeCompartment.value) {
    editorView.value.dispatch({
      effects: themeCompartment.value.reconfigure(themeExtensions.value),
    });
    
    // Update gutters border after theme change
    nextTick(() => {
      if (editorView.value) {
        const gutters = editorView.value.dom.querySelector('.cm-gutters');
        if (gutters) {
          const isDark = colorMode.value === 'dark';
          (gutters as HTMLElement).style.borderRight = isDark 
            ? '1px solid rgba(255, 255, 255, 0.08)' 
            : '1px solid #e5e7eb';
        }
      }
    });
  }
});

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

onMounted(async () => {
  // Initialize CodeMirror first
  await initCodeMirror()
  
  // Wait for CodeMirror to load if still loading
  if (loadingCodeMirror.value) {
    await new Promise((resolve) => {
      const unwatch = watch(loadingCodeMirror, (loading) => {
        if (!loading) {
          unwatch()
          resolve(undefined)
        }
      })
    })
  }
  
  // Wait for modules to be ready and extensions to be computed
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Wait until extensions are ready
  let retries = 0
  while (extensions.value.length === 0 && retries < 10) {
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()
    retries++
  }
  
  if (codeMirrorModules.value && extensions.value.length > 0) {
    createEditor(extensions.value);
    watchExtensions(extensions);
  } else {
    console.error('Failed to initialize CodeMirror editor: extensions not ready')
  }
  if (containerRef.value) {
    containerRef.value.style.height = currentHeight.value;
  }
  
  await nextTick();
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
  
  // Force update gutters border after editor is created
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 100));
  if (editorView.value) {
    const gutters = editorView.value.dom.querySelector('.cm-gutters');
    if (gutters) {
      const isDark = colorMode.value === 'dark';
      (gutters as HTMLElement).style.borderRight = isDark 
        ? '1px solid rgba(255, 255, 255, 0.08)' 
        : '1px solid #e5e7eb';
    }
  }
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
    if (editorView.value && codeMirrorModules.value?.StateEffect) {
      editorView.value.requestMeasure();
      editorView.value.dispatch({
        effects: codeMirrorModules.value.StateEffect.reconfigure.of(extensions.value),
      });
      editorView.value.dispatch({});
    }
  });
}
</script>

<template>
  <div 
    ref="containerRef" 
    class="rounded-md overflow-hidden relative"
    :class="[
      !isResizing ? 'transition-[height] duration-300 ease-out' : '',
      colorMode.value === 'dark' ? 'ring-1 ring-gray-700' : 'ring-1 ring-gray-200'
    ]"
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
      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-colors group z-50 select-none"
      :class="{ 'bg-gray-300 dark:bg-gray-600/50': isResizing }"
      style="touch-action: none; pointer-events: auto;"
    >
      <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
        <div class="w-12 h-0.5 bg-gray-400 dark:bg-gray-500 group-hover:bg-gray-500 dark:group-hover:bg-gray-400 rounded-full"></div>
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