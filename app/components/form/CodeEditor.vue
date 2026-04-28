<script setup lang="ts">
import type { PermissionCondition } from "~/types/permissions";

type TestRunConfig = {
  kind?: string;
  label?: string;
  tableName?: string;
  fieldName?: string;
  timeoutMs?: number;
  scriptLanguage?: "javascript" | "typescript";
  body?: any;
  data?: any;
  params?: any;
  query?: any;
  permission?: PermissionCondition;
  payload?: Record<string, any>;
};

const props = defineProps<{
  modelValue?: string;
  language?: "javascript" | "typescript" | "vue" | "json" | "html";
  height?: string;
  enfyraAutocomplete?: boolean | 'vue';
  error?: string;
  testRun?: boolean | TestRunConfig;
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
const showTestResult = ref(false);

const colorMode = useColorMode();
const notify = useNotify();
const { checkPermissionCondition } = usePermissions();
const {
  execute: executeTestRun,
  pending: testRunning,
  error: testRunError,
  data: testRunData,
} = useApi(() => "/admin/test/run", {
  method: "post",
  errorContext: "Test Code",
  disableErrorPage: true,
  immediate: false,
  lazy: true,
});

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

const testRunConfig = computed<TestRunConfig | null>(() => {
  if (props.testRun === false) return null;
  if (props.testRun === undefined) return {};
  return props.testRun === true ? {} : props.testRun;
});

const canShowTestRun = computed(() => {
  const config = testRunConfig.value;
  if (!config) return false;
  if (props.language !== "javascript" && props.language !== "typescript") return false;
  const permission = config.permission ?? {
    and: [{ route: "/admin/test/run", actions: ["create"] }],
  };
  return checkPermissionCondition(permission);
});

const canRunTest = computed(() => {
  return canShowTestRun.value && String(props.modelValue || "").trim().length > 0;
});

const testResultText = computed(() => {
  const value = (testRunData.value as any)?.result ?? testRunData.value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
});

const testLogsText = computed(() => {
  const logs = (testRunData.value as any)?.logs;
  if (!Array.isArray(logs) || logs.length === 0) return "";
  try {
    return JSON.stringify(logs, null, 2);
  } catch {
    return String(logs);
  }
});

const testEmittedText = computed(() => {
  const emitted = (testRunData.value as any)?.emitted;
  if (!Array.isArray(emitted) || emitted.length === 0) return "";
  try {
    return JSON.stringify(emitted, null, 2);
  } catch {
    return String(emitted);
  }
});

const testErrorText = computed(() => {
  const error = (testRunData.value as any)?.error;
  if (!error) return "";
  return error?.message || String(error);
});

async function copyTestValue(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  await navigator.clipboard.writeText(text);
  notify.success("Copied");
}

async function runCodeTest() {
  const config = testRunConfig.value;
  const script = String(props.modelValue || "").trim();
  if (!config || !script || testRunning.value) return;
  testRunData.value = null;

  await executeTestRun({
    body: {
      kind: config.kind || "script",
      tableName: config.tableName,
      fieldName: config.fieldName,
      timeoutMs: config.timeoutMs ?? 5000,
      script,
      scriptLanguage:
        config.scriptLanguage ||
        (props.language === "javascript" ? "javascript" : "typescript"),
      body: config.body,
      data: config.data,
      params: config.params,
      query: config.query,
      ...(config.payload || {}),
    },
  });

  if (testRunError.value) {
    notify.error("Test failed", testRunError.value.message);
    showTestResult.value = true;
    return;
  }

  showTestResult.value = true;
}

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

let resizeFinalizeTimeout: number | null = null;
let resizeRemountTimeout: number | null = null;
let initialMountTimeout: number | null = null;

function applyGuttersBorder() {
  if (!editorView.value) return;
  const gutters = editorView.value.dom.querySelector('.cm-gutters');
  if (gutters) {
    (gutters as HTMLElement).style.borderRight = '1px solid var(--border-neutral)';
  }
}

function finishResizeSync() {
  if (resizeFinalizeTimeout) {
    window.clearTimeout(resizeFinalizeTimeout);
    resizeFinalizeTimeout = null;
  }
  if (resizeRemountTimeout) {
    window.clearTimeout(resizeRemountTimeout);
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
  if (resizeFinalizeTimeout) window.clearTimeout(resizeFinalizeTimeout);
  resizeFinalizeTimeout = window.setTimeout(() => {
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
    window.clearTimeout(resizeFinalizeTimeout);
  }
  if (resizeRemountTimeout) {
    window.clearTimeout(resizeRemountTimeout);
  }
  if (initialMountTimeout) {
    window.clearTimeout(initialMountTimeout);
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

watch(() => props.language, async () => {
  if (!editorView.value || extensions.value.length === 0) return;
  emit("diagnostics", []);
  await nextTick();
  recreateEditor(extensions.value);
  nextTick(() => {
    if (editorRef.value) editorRef.value.style.height = "100%";
    applyGuttersBorder();
    updateEditorSize();
  });
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
    <div
      v-if="canShowTestRun"
      class="absolute right-2 top-2 z-[60] flex items-center gap-2"
      style="pointer-events: auto;"
    >
      <UTooltip text="Run code">
        <UButton
          type="button"
          :icon="testRunning ? 'i-lucide-loader-2' : 'i-lucide-play'"
          size="xs"
          variant="soft"
          color="primary"
          :loading="testRunning"
          :disabled="!canRunTest"
          :label="testRunConfig?.label || 'Test'"
          @click.stop="runCodeTest"
        />
      </UTooltip>
    </div>

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

  <CommonModal v-model="showTestResult">
    <template #title>Test Result</template>
    <template #body>
      <div class="space-y-3">
        <UBadge
          :color="(testRunData as any)?.success === false ? 'error' : 'success'"
          variant="subtle"
        >
          {{ (testRunData as any)?.success === false ? 'Failed' : 'Passed' }}
        </UBadge>
        <div v-if="testErrorText" class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
          {{ testErrorText }}
        </div>
        <div v-if="testResultText" class="space-y-1">
          <div class="flex items-center justify-between gap-2">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Result</div>
            <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyTestValue((testRunData as any)?.result ?? testRunData)">Copy</UButton>
          </div>
          <pre class="max-h-[260px] overflow-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 text-xs whitespace-pre-wrap select-text cursor-text">{{ testResultText }}</pre>
        </div>
        <div v-if="testLogsText" class="space-y-1">
          <div class="flex items-center justify-between gap-2">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Logs</div>
            <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyTestValue((testRunData as any)?.logs)">Copy</UButton>
          </div>
          <pre class="max-h-[180px] overflow-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 text-xs whitespace-pre-wrap select-text cursor-text">{{ testLogsText }}</pre>
        </div>
        <div v-if="testEmittedText" class="space-y-1">
          <div class="flex items-center justify-between gap-2">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Emitted</div>
            <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyTestValue((testRunData as any)?.emitted)">Copy</UButton>
          </div>
          <pre class="max-h-[180px] overflow-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] p-3 text-xs whitespace-pre-wrap select-text cursor-text">{{ testEmittedText }}</pre>
        </div>
      </div>
    </template>
  </CommonModal>
</template>

<style scoped>
.codemirror-editor {
  font-family: "Fira Code", "JetBrains Mono", monospace;
  height: 100%;
  width: 100%;
}
</style>
