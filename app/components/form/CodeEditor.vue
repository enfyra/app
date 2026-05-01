<script setup lang="ts">
import type { PermissionCondition } from "~/types/permissions";

type TestRunConfig = {
  kind?: string;
  label?: string;
  configure?: boolean;
  method?: string;
  methods?: string[];
  routePath?: string;
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

defineOptions({
  inheritAttrs: false,
});

const emit = defineEmits(["update:modelValue", "diagnostics"]);
const attrs = useAttrs();
const containerAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});

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
const showTestSetup = ref(false);
const testMethod = ref("GET");
const testBody = ref("{\n  \n}");
const testQueryParams = ref<{ key: string; value: string; enabled: boolean }[]>([]);
const testRouteParams = ref<{ key: string; value: string }[]>([]);
const testSetupError = ref("");
let testSetupOpenFrame: number | null = null;

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

const isConfiguredTest = computed(() => !!testRunConfig.value?.configure);

const testMethods = computed(() => {
  const methods = testRunConfig.value?.methods?.filter(Boolean);
  return methods && methods.length > 0 ? methods : ["GET", "POST", "PATCH", "DELETE"];
});

const testNeedsBody = computed(() => ["POST", "PATCH"].includes(testMethod.value));

const testRouteParamNames = computed(() => {
  const path = testRunConfig.value?.routePath || "";
  const names = new Set<string>();
  for (const match of path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names];
});

const testResultValue = computed(() => {
  const data = testRunData.value as any;
  if (data && Object.prototype.hasOwnProperty.call(data, "result")) {
    return data.result;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return Object.fromEntries(
      Object.entries(data).filter(
        ([key]) =>
          key !== "success" &&
          key !== "error" &&
          key !== "logs" &&
          key !== "emitted",
      ),
    );
  }
  return data;
});

const testResultText = computed(() => {
  const value = testResultValue.value;
  if (value === null || value === undefined) return "";
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) return "";
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

const testRunFailed = computed(() => {
  return !!testRunError.value || (testRunData.value as any)?.success === false;
});

const hasTestRunOutcome = computed(() => {
  return !!testRunError.value || testRunData.value !== null;
});

async function copyTestValue(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  await navigator.clipboard.writeText(text);
  notify.success("Copied");
}

function normalizeTestMethod(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "method" in value) {
    const method = (value as any).method;
    if (typeof method === "string" && method) return method;
  }
  return "GET";
}

function blurActiveElement() {
  if (typeof document === "undefined") return;
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
}

function openTestSetupDrawer() {
  blurActiveElement();
  if (typeof window === "undefined") {
    showTestSetup.value = true;
    return;
  }
  if (testSetupOpenFrame) window.cancelAnimationFrame(testSetupOpenFrame);
  testSetupOpenFrame = window.requestAnimationFrame(() => {
    testSetupOpenFrame = null;
    showTestSetup.value = true;
  });
}

function openTestSetup() {
  const config = testRunConfig.value;
  if (!config || !canRunTest.value) return;
  testMethod.value = normalizeTestMethod(config.method ?? config.payload?.method);
  if (!testMethods.value.includes(testMethod.value)) {
    testMethod.value = testMethods.value[0] || "GET";
  }
  testBody.value = "{\n  \n}";
  testQueryParams.value = [
    { key: "limit", value: "10", enabled: false },
    { key: "sort", value: "-createdAt", enabled: false },
  ];
  testRouteParams.value = testRouteParamNames.value.map((key) => ({
    key,
    value: "",
  }));
  testSetupError.value = "";
  testRunData.value = null;
  openTestSetupDrawer();
}

function parseJsonInput(raw: string, label: string): any {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
    .replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(normalized);
    } catch {
      throw new Error(`${label} must be valid JSON or a simple object literal.`);
    }
  }
}

function addTestQueryParam() {
  testQueryParams.value.push({ key: "", value: "", enabled: true });
}

function buildTestQueryObject(): Record<string, string> {
  const query: Record<string, string> = {};
  for (const param of testQueryParams.value) {
    if (param.enabled && param.key) query[param.key] = param.value;
  }
  return query;
}

function buildTestParamsObject(): Record<string, string> {
  const params: Record<string, string> = {};
  for (const param of testRouteParams.value) {
    params[param.key] = param.value;
  }
  return params;
}

async function runCodeTest(overrides: Record<string, any> = {}, showResult = true) {
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
      ...overrides,
    },
  });

  if (testRunError.value) {
    notify.error("Test failed", testRunError.value.message);
    if (showResult) openTestSetupDrawer();
    return;
  }

  if (showResult) openTestSetupDrawer();
}

async function runConfiguredCodeTest() {
  testSetupError.value = "";
  try {
    const overrides: Record<string, any> = {
      method: testMethod.value,
      params: buildTestParamsObject(),
      query: buildTestQueryObject(),
    };
    if (testNeedsBody.value) {
      overrides.body = parseJsonInput(testBody.value, "Body");
    }
    await runCodeTest(overrides, false);
  } catch (err: any) {
    testSetupError.value = err?.message || "Invalid test input.";
  }
}

function handleTestClick() {
  if (testRunConfig.value?.configure) {
    openTestSetup();
    return;
  }
  testRunData.value = null;
  runCodeTest();
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
  if (testSetupOpenFrame) {
    window.cancelAnimationFrame(testSetupOpenFrame);
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
    v-bind="containerAttrs"
    ref="containerRef" 
    class="rounded-md overflow-hidden relative"
    @transitionend="handleHeightTransitionEnd"
    :class="[
      attrs.class,
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
          @mousedown.prevent
          @click.stop="handleTestClick"
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

  <CommonDrawer v-model="showTestSetup" nested>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-flask-conical" class="w-5 h-5 text-primary-500" />
        <span>Test Code</span>
      </div>
    </template>
    <template #body>
      <div class="space-y-5">
        <template v-if="isConfiguredTest">
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="methodOption in testMethods"
              :key="methodOption"
              size="xs"
              :variant="testMethod === methodOption ? 'solid' : 'outline'"
              :color="testMethod === methodOption ? 'primary' : 'neutral'"
              @click="testMethod = methodOption"
            >
              {{ methodOption }}
            </UButton>
          </div>

          <div v-if="testNeedsBody">
            <h4 class="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Request Body</h4>
            <FormCodeEditorLazy v-model="testBody" language="json" height="200px" class="w-full" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-semibold text-[var(--text-tertiary)]">Query Parameters</h4>
              <UButton size="xs" variant="ghost" icon="i-lucide-plus" @click="addTestQueryParam">Add</UButton>
            </div>
            <div class="space-y-1.5">
              <div v-for="(param, idx) in testQueryParams" :key="idx" class="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                <USwitch v-model="param.enabled" size="xs" class="flex-shrink-0" />
                <UInput v-model="param.key" placeholder="key" class="w-full sm:w-[150px] font-mono text-xs" :disabled="!param.enabled" />
                <UInput v-model="param.value" placeholder="value" class="w-full sm:flex-1 font-mono text-xs min-w-0" :disabled="!param.enabled" />
                <UButton size="xs" variant="ghost" color="error" icon="i-lucide-x" class="flex-shrink-0" @click="testQueryParams.splice(idx, 1)" />
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Route Params</h4>
            <div v-if="testRouteParams.length > 0" class="space-y-1.5">
              <div v-for="param in testRouteParams" :key="param.key" class="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                <div class="w-full sm:w-[180px] rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-mono text-[var(--text-secondary)]">
                  @PARAMS.{{ param.key }}
                </div>
                <UInput v-model="param.value" :placeholder="param.key" class="w-full sm:flex-1 font-mono text-xs min-w-0" />
              </div>
            </div>
            <div v-else class="rounded-md border border-dashed border-[var(--border-default)] p-3 text-xs text-[var(--text-tertiary)]">
              No route params detected from this route path.
            </div>
          </div>

          <div v-if="testSetupError" class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
            {{ testSetupError }}
          </div>
        </template>

        <div v-if="hasTestRunOutcome" :class="isConfiguredTest ? 'border-t border-[var(--border-default)] pt-5 space-y-3' : 'space-y-3'">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-xs font-semibold text-[var(--text-tertiary)]">Result</h4>
            <UBadge
              :color="testRunFailed ? 'error' : 'success'"
              variant="subtle"
            >
              {{ testRunFailed ? 'Failed' : 'Passed' }}
            </UBadge>
          </div>

          <div v-if="testRunError?.message" class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
            {{ testRunError.message }}
          </div>
          <div v-else-if="testErrorText" class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
            {{ testErrorText }}
          </div>

          <div v-if="testResultText" class="space-y-1">
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs font-medium text-[var(--text-tertiary)]">Data</div>
              <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyTestValue(testResultValue)">Copy</UButton>
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
      </div>
    </template>
    <template #footer>
      <div v-if="isConfiguredTest" class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="neutral" @click="showTestSetup = false">Cancel</UButton>
        <UButton color="primary" icon="i-lucide-play" :loading="testRunning" @click="runConfiguredCodeTest">
          Run
        </UButton>
      </div>
    </template>
  </CommonDrawer>
</template>

<style scoped>
.codemirror-editor {
  font-family: "Fira Code", "JetBrains Mono", monospace;
  height: 100%;
  width: 100%;
}
</style>
