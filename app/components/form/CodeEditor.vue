<script setup lang="ts">
const props = defineProps<{
  modelValue?: string;
  language?: "javascript" | "typescript" | "vue" | "json" | "html";
  height?: string;
  enfyraAutocomplete?: boolean | 'vue';
  error?: string;
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

const colorMode = useColorMode();

const { initCodeMirror, codeMirrorModules } = useCodeMirrorLazy()

const { themeCompartment, themeExtensions, customHighlightStyle } = useCodeMirrorTheme(currentHeight, codeMirrorModules, colorMode);

const { editorRef, createEditor, recreateEditor, destroyEditor, editorView, updateEditorSize } = useCodeMirrorEditor({
  modelValue: toRef(props, "modelValue"),
  emit,
  codeMirrorModules: codeMirrorModules
});

const { getLanguageExtension, getBasicSetup, enfyraSyntaxPlugin } = useCodeMirrorExtensions(codeMirrorModules)

const languageExtension = computed(() => {
  if (!codeMirrorModules.value) return null
  return getLanguageExtension(props.language)
});

const extensions = computed(() => {
  if (!codeMirrorModules.value || !themeCompartment.value) return []
  
  const setup = getBasicSetup(props.language, (diags: any[]) => {
    emit("diagnostics", diags);
  }, props.enfyraAutocomplete)
  
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
  
  if (customHighlightStyle?.value) {
    exts.push(customHighlightStyle.value)
  } else if (codeMirrorModules.value?.syntaxHighlighting && codeMirrorModules.value?.defaultHighlightStyle) {
    exts.push(codeMirrorModules.value.syntaxHighlighting(codeMirrorModules.value.defaultHighlightStyle))
  }
  
  if (enfyraSyntaxPlugin?.value) {
    exts.push(enfyraSyntaxPlugin.value)
  }

  return exts
});

watch(() => colorMode.value, () => {
  if (editorView.value && themeCompartment.value) {
    editorView.value.dispatch({
      effects: themeCompartment.value.reconfigure(themeExtensions.value),
    });

    nextTick(() => {
      if (editorView.value) {
        const gutters = editorView.value.dom.querySelector('.cm-gutters');
        if (gutters) {
          (gutters as HTMLElement).style.borderRight = '1px solid var(--border-neutral)';
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
});

let resizeFinalizeTimeout: ReturnType<typeof setTimeout> | null = null;
let resizeRemountTimeout: ReturnType<typeof setTimeout> | null = null;
let initialMountTimeout: ReturnType<typeof setTimeout> | null = null;

function applyGuttersBorder() {
  if (!editorView.value) return;
  const gutters = editorView.value.dom.querySelector('.cm-gutters');
  if (gutters) {
    (gutters as HTMLElement).style.borderRight = '1px solid var(--border-neutral)';
  }
}

function finishResizeSync() {
  if (resizeFinalizeTimeout) {
    clearTimeout(resizeFinalizeTimeout);
    resizeFinalizeTimeout = null;
  }
  if (resizeRemountTimeout) {
    clearTimeout(resizeRemountTimeout);
    resizeRemountTimeout = null;
  }
  resizeRemountTimeout = window.setTimeout(() => {
    resizeRemountTimeout = null;
    if (editorRef.value) {
      editorRef.value.style.height = "100%";
    }
    recreateEditor(extensions.value);
    nextTick(() => {
      applyGuttersBorder();
    });
  }, 60);
}

function scheduleResizeFinishFallback() {
  if (resizeFinalizeTimeout) clearTimeout(resizeFinalizeTimeout);
  resizeFinalizeTimeout = setTimeout(() => {
    finishResizeSync();
  }, 380);
}

function handleHeightTransitionEnd(event: TransitionEvent) {
  if (event.target !== containerRef.value || event.propertyName !== "height") return;
  finishResizeSync();
}

onMounted(async () => {
  try {
    await initCodeMirror();

    if (containerRef.value) {
      containerRef.value.style.height = currentHeight.value;
    }

    let stopWatch: (() => void) | undefined;
    stopWatch = watch(
      [extensions, editorRef],
      ([exts, ref]) => {
        if (editorView.value || !ref || exts.length === 0 || initialMountTimeout) return;
        initialMountTimeout = window.setTimeout(() => {
          initialMountTimeout = null;
          if (editorView.value || !editorRef.value || extensions.value.length === 0) return;
          createEditor(extensions.value);
          if (!editorView.value) return;
          stopWatch?.();
          nextTick(() => {
            if (editorRef.value) editorRef.value.style.height = "100%";
            applyGuttersBorder();
            updateEditorSize();
          });
        }, 60);
      },
      { immediate: true, flush: 'post' }
    );
  } catch (error) {
    console.error('Error initializing CodeMirror editor:', error);
  }
});

onUnmounted(() => {
  if (resizeFinalizeTimeout) {
    clearTimeout(resizeFinalizeTimeout);
  }
  if (resizeRemountTimeout) {
    clearTimeout(resizeRemountTimeout);
  }
  if (initialMountTimeout) {
    clearTimeout(initialMountTimeout);
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
  
  if (editorRef.value) {
    editorRef.value.style.height = "100%";
  }
  
  nextTick(() => {
    requestAnimationFrame(() => {
      currentHeight.value = finalHeight;
      scheduleResizeFinishFallback();
    });
  });
}
</script>

<template>
  <div 
    ref="containerRef" 
    class="rounded-md overflow-hidden relative"
    @transitionend="handleHeightTransitionEnd"
    :class="[
      !isResizing ? 'transition-[height] duration-300 ease-out' : '',
      props.error
        ? 'border border-red-500 ring-2 ring-red-500/20'
        : 'border border-[var(--border-strong)]'
    ]"
    :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
  >
    <div ref="editorRef" class="codemirror-editor h-full" />

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
      class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-[var(--surface-muted)] transition-colors group z-50 select-none"
      :class="{ 'bg-[var(--surface-muted)]': isResizing }"
      style="touch-action: none; pointer-events: auto;"
    >
      <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
        <div class="w-12 h-0.5 bg-[var(--text-quaternary)] group-hover:bg-[var(--text-tertiary)] rounded-full"></div>
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
