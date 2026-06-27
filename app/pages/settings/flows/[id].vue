<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <div v-if="!isMounted || loading" class="eapp-page-constrained space-y-6">
        <CommonFormCard>
          <CommonLoadingState type="form" />
        </CommonFormCard>
        <CommonFormCard>
          <div class="h-[400px] flex items-center justify-center">
            <CommonLoadingState type="dots" size="md" />
          </div>
        </CommonFormCard>
        <CommonFormCard>
          <CommonLoadingState type="skeleton" />
        </CommonFormCard>
      </div>

      <div v-else-if="flow" class="eapp-page-constrained space-y-6">
        <CommonFormCard>
          <UForm :state="editForm" @submit="saveFlowSettings">
            <FormEditorLazy
              v-model="editForm"
              :table-name="'enfyra_flow'"
              :errors="flowErrors"
              :excluded="['steps', 'isSystem']"
              :field-map="flowFieldMap"
              @update:errors="(e: any) => flowErrors = e"
              @has-changed="(v: boolean) => hasFormChanges = v"
              mode="update"
            />

            <div
              class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-6"
            >
              <UButton
                v-if="canUpdateFlow"
                label="Save"
                icon="lucide:save"
                variant="solid"
                color="primary"
                type="submit"
                :loading="saveFlowPending"
                :disabled="!hasFormChanges"
              />
            </div>
          </UForm>
        </CommonFormCard>

        <CommonFormCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-[var(--text-primary)]">Flow Steps</h3>
              <UButton icon="lucide:plus" size="sm" variant="solid" color="primary" @click="() => openCreateStep()">
                Add Step
              </UButton>
            </div>
          </template>
          <div class="h-[400px] md:h-[500px] lg:h-[600px]">
            <FlowCanvas
              :flow="flow"
              :steps="steps"
              @select-step="onSelectStep"
              @add-step="openCreateStep"
              @move-step="handleMoveStep"
              :reordering="reordering"
              :execution-overlay="latestExecOverlay"
            />
          </div>
        </CommonFormCard>

        <FlowExecutionsCard
          :executions="executions"
          :has-more="hasMoreExecs"
          :loading="execLoading"
          @refresh="refreshExecutions"
          @load-more="loadMoreExecutions"
          @open="openExecution"
        />
      </div>

      <CommonEmptyState v-else title="Flow not found" icon="lucide:workflow" size="lg" />
    </Transition>

    <CommonDrawer v-model="stepDrawerOpen" direction="right" full-width>
      <template #header>
        <div class="flex items-center gap-2 w-full min-w-0">
          <h3 class="text-lg font-semibold flex-shrink-0">{{ editingStepId ? 'Edit Step' : 'New Step' }}</h3>
          <template v-if="stepForm.parentId">
            <span class="text-[var(--text-quaternary)]">·</span>
            <UBadge color="secondary" variant="soft" size="md">{{ getConditionLabel(stepForm.parentId) }}</UBadge>
            <UBadge :color="stepForm.branch === 'true' ? 'success' : 'error'" variant="soft" size="md">{{ stepForm.branch === 'true' ? 'True' : 'False' }}</UBadge>
          </template>
        </div>
      </template>
      <template #body>
        <div class="p-4 space-y-4">
          <UFormField label="Key" required class="w-full" :error="stepErrors.key">
            <UInput v-model="stepForm.key" placeholder="e.g. check_user" class="w-full" />
            <template #hint><span class="text-[10px]">Reference via <code class="bg-[var(--surface-muted)] px-1 rounded">@FLOW.{{ stepForm.key || 'key' }}</code></span></template>
          </UFormField>

          <UFormField label="Timeout" class="w-full">
            <UInput v-model.number="stepForm.timeout" type="number" class="w-full">
              <template #trailing><span class="text-xs text-[var(--text-quaternary)]">ms</span></template>
            </UInput>
          </UFormField>

          <UFormField label="Type" required class="w-full" :error="stepErrors.type">
            <USelect v-model="stepForm.type" :items="stepTypeOptions" value-key="value" class="w-full" />
          </UFormField>

          <div class="p-3 rounded-lg border" :class="hasStepConfigErrors ? 'bg-[var(--state-danger-soft-bg)] border-[var(--state-danger-outline-border)]' : 'bg-[var(--surface-muted)] border-[var(--border-default)]'">
            <p v-if="stepErrors.config" class="text-xs text-[var(--md-error)] mb-2">{{ stepErrors.config }}</p>
            <p v-else-if="stepErrors.sourceCode" class="text-xs text-[var(--md-error)] mb-2">{{ stepErrors.sourceCode }}</p>
            <FlowStepConfigEditor
              :type="stepForm.type"
              :config-json="stepForm.configJson"
              :source-code="stepForm.sourceCode"
              :script-language="stepForm.scriptLanguage"
              :errors="stepErrors"
              @update:config-json="stepForm.configJson = $event; stepErrors.config = ''"
              @update:source-code="stepForm.sourceCode = $event; stepForm.compiledCode = null; stepErrors.config = ''"
              @update:script-language="stepForm.scriptLanguage = $event; stepForm.compiledCode = null"
              @update:errors="stepErrors = $event"
            />
          </div>

          <div :class="stepForm.onError === 'retry' ? 'grid grid-cols-2 gap-3' : ''">
            <UFormField label="On Error" class="w-full">
              <USelect v-model="stepForm.onError" :items="errorOptions" value-key="value" class="w-full" />
            </UFormField>
            <UFormField v-if="stepForm.onError === 'retry'" label="Retries" class="w-full">
              <UInput v-model.number="stepForm.retryAttempts" type="number" placeholder="3" class="w-full" />
            </UFormField>
          </div>

          <div v-if="!stepForm.parentId && conditionStepOptions.length > 1" class="grid grid-cols-2 gap-3">
            <UFormField label="Attach to Condition" class="w-full">
              <USelect v-model="stepForm.parentId" :items="conditionStepOptions" value-key="value" class="w-full" placeholder="None (root level)" />
            </UFormField>
            <UFormField v-if="stepForm.parentId" label="Execute when" class="w-full">
              <USelect v-model="stepForm.branch" :items="[{label: 'Condition is True', value: 'true'}, {label: 'Condition is False', value: 'false'}]" value-key="value" class="w-full" />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="w-full">
          <div class="px-4 py-3">
            <UFormField label="Test Payload (optional)" class="w-full">
              <UTextarea v-model="testPayloadJson" :rows="2" class="w-full font-mono text-xs" placeholder='{"orderId": 123, "email": "test@test.com"}' />
              <template #hint><span class="text-[10px]">Accessible via <code class="bg-[var(--surface-muted)] px-1 rounded">@FLOW_PAYLOAD</code> in step code</span></template>
            </UFormField>
          </div>
          <div v-if="testResult" class="px-4 py-3 border-t border-[var(--border-default)]">
            <div class="flex items-center gap-2 mb-2">
              <UIcon :name="testResult.success ? 'i-lucide-check-circle' : 'i-lucide-x-circle'" :class="testResult.success ? 'text-[var(--st-success)]' : 'text-[var(--md-error)]'" class="w-4 h-4" />
              <span class="text-xs font-medium" :class="testResult.success ? 'text-[var(--st-success)]' : 'text-[var(--md-error)]'">
                {{ testResult.success ? 'Test passed' : 'Test failed' }} ({{ testResult.duration }}ms)
              </span>
            </div>
            <div v-if="testResult.error" class="p-2 rounded bg-[var(--state-danger-soft-bg)] text-xs text-[var(--md-error)] break-words">{{ testResult.error }}</div>
            <div v-else class="space-y-2">
              <div v-if="testResult.result !== undefined" class="space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-medium text-[var(--text-tertiary)]">Result</div>
                  <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyTestValue(testResult.result)">Copy</UButton>
                </div>
                <pre class="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)] overflow-auto max-h-[200px] whitespace-pre-wrap select-text cursor-text">{{ JSON.stringify(testResult.result, null, 2) }}</pre>
              </div>
              <div v-if="testResult.logs?.length" class="space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-medium text-[var(--text-tertiary)]">Logs</div>
                  <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyTestValue(testResult.logs)">Copy</UButton>
                </div>
                <pre class="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)] overflow-auto max-h-[200px] whitespace-pre-wrap select-text cursor-text">{{ JSON.stringify(testResult.logs, null, 2) }}</pre>
              </div>
              <div v-if="testResult.emitted?.length" class="space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-medium text-[var(--text-tertiary)]">Emitted</div>
                  <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyTestValue(testResult.emitted)">Copy</UButton>
                </div>
                <pre class="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)] overflow-auto max-h-[200px] whitespace-pre-wrap select-text cursor-text">{{ JSON.stringify(testResult.emitted, null, 2) }}</pre>
              </div>
            </div>
          </div>
          <div class="flex gap-2 w-full p-4 border-t border-[var(--border-default)]">
            <UButton v-if="editingStepId" color="error" variant="soft" @click="deleteCurrentStep">Delete</UButton>
            <UButton v-if="editingStepId" variant="soft" icon="i-lucide-copy" @click="duplicateStep">Duplicate</UButton>
            <UButton v-if="!testing" color="warning" variant="soft" icon="i-lucide-flask-conical" @click="testCurrentStep">Test</UButton>
            <UButton v-else color="error" variant="soft" icon="i-lucide-x" @click="cancelTest">Cancel</UButton>
            <div class="flex-1" />
            <UButton variant="ghost" color="error" @click="closeStepDrawer">Cancel</UButton>
            <UButton color="primary" @click="saveStep" :loading="savingStep" :disabled="hasStepErrors">
              {{ editingStepId ? 'Update' : 'Create' }}
            </UButton>
          </div>
        </div>
      </template>
    </CommonDrawer>

    <FlowExecutionDetailDrawer
      v-model="execDrawerOpen"
      :selected-exec="selectedExec"
      :parsed-error="parsedError"
      :exec-step-timeline="execStepTimeline"
      :parsed-context="parsedContext"
      :expanded-steps="expandedSteps"
      @toggle-step-result="toggleStepResult"
      @rerun-execution="rerunExecution"
    />
  </div>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import type { StepType, StepErrorHandling } from '~/types/flow';
import { STEP_TYPE_OPTIONS, ERROR_OPTIONS } from '~/utils/flow.constants';
import {
  normalizeScriptContract,
  stripLegacyScriptFields,
} from '~/utils/script-contract';

definePageMeta({ layout: "default", title: "Flow Editor" });

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const { confirm } = useConfirm();
const { isMounted } = useMounted();
const { getId, getIdFieldName } = useDatabase();
const { registerPageHeader } = usePageHeaderRegistry();

const flowId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
const { adminSocket } = useAdminSocket();
const stepDrawerOpen = ref(false);
const editingStepId = ref<string | number | null>(null);
const savingStep = ref(false);
const stepFormSnapshot = ref('');
const testing = ref(false);
const testResult = ref<any>(null);
const testPayloadJson = ref('');
const stepErrors = ref<Record<string, string>>({});
const flowErrors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const execDrawerOpen = ref(false);
const selectedExec = ref<any>(null);
const execLoading = ref(false);
const reordering = ref(false);

const stepTypeOptions = STEP_TYPE_OPTIONS;
const errorOptions = ERROR_OPTIONS;
const editForm = ref<Record<string, any>>({});

const TriggerConfigEditor = resolveComponent('FlowTriggerConfigEditor');

const flowFieldMap = computed(() => ({
  name: { description: `@DISPATCH.trigger('${editForm.value.name || 'name'}')` },
  triggerConfig: {
    label: 'Trigger Configuration',
    hideDescription: true,
    component: TriggerConfigEditor,
    componentProps: { triggerType: editForm.value.triggerType },
  },
}));

const conditionSteps = computed(() => steps.value.filter((s: any) => s.type === 'condition'));
const conditionStepOptions = computed(() => [
  { label: 'None (root level)', value: null },
  ...conditionSteps.value
    .filter((s: any) => !editingStepId.value || String(getId(s)) !== String(editingStepId.value))
    .map((s: any) => ({ label: s.key, value: getId(s) })),
]);

function getConditionLabel(parentId: any): string {
  const step = steps.value.find((s: any) => String(getId(s)) === String(parentId));
  return step?.key || `Step #${parentId}`;
}


const stepForm = ref({
  key: '',
  stepOrder: 0,
  type: 'script' as StepType,
  configJson: '',
  sourceCode: null as string | null,
  scriptLanguage: 'typescript' as 'javascript' | 'typescript',
  compiledCode: null as string | null,
  timeout: 5000,
  onError: 'stop' as StepErrorHandling,
  retryAttempts: 0,
  parentId: null as any,
  branch: undefined as string | undefined,
});

const hasStepErrors = computed(() =>
  Object.values(stepErrors.value).some((message) => Boolean(message)),
);
const hasStepConfigErrors = computed(() =>
  Boolean(stepErrors.value.config || stepErrors.value.sourceCode || stepErrors.value.scriptLanguage),
);

function cleanStepConfig(config: any): Record<string, any> {
  return stripLegacyScriptFields(config);
}

function parseStepConfigJson(raw: string): Record<string, any> {
  return raw ? JSON.parse(raw) : {};
}

watch(() => stepForm.value.key, () => {
  if (stepErrors.value.key) stepErrors.value.key = '';
});
watch(() => stepForm.value.type, () => {
  if (stepErrors.value.type) stepErrors.value.type = '';
});

registerPageHeader({ title: "Flow Editor", gradient: "purple" });

const { data: flowData, pending: loading, execute: fetchFlow } = useApi(
  () => `/enfyra_flow?filter={"${getIdFieldName()}":{"_eq":"${flowId}"}}&fields=*,steps.*,steps.parent.id&limit=1`,
  { errorContext: "Fetch Flow" }
);

const flow = computed(() => flowData.value?.data?.[0] || null);
const steps = computed(() => {
  const s = flow.value?.steps || [];
  return [...s].sort((a: any, b: any) => (a.stepOrder || 0) - (b.stepOrder || 0));
});

const EXEC_LIMIT = 10;
const EXEC_FIELDS = 'id,status,startedAt,completedAt,duration,currentStep';
const allExecutions = ref<any[]>([]);
const hasMoreExecs = ref(true);
const execCursor = ref<number | null>(null);

const { data: execData, execute: fetchExecApi } = useApi(
  () => {
    const filter: any = { flow: { _eq: flowId } };
    if (execCursor.value) filter.id = { _lt: execCursor.value };
    return `/enfyra_flow_execution?filter=${JSON.stringify(filter)}&sort=-id&limit=${EXEC_LIMIT}&fields=${EXEC_FIELDS}`;
  },
  { errorContext: "Fetch Executions" }
);

async function fetchExecutions() {
  execCursor.value = null;
  allExecutions.value = [];
  hasMoreExecs.value = true;
  await fetchExecApi();
  const items = execData.value?.data || [];
  allExecutions.value = items;
  hasMoreExecs.value = items.length >= EXEC_LIMIT;
  if (items.length > 0) execCursor.value = items[items.length - 1].id;
}

async function loadMoreExecutions() {
  if (!hasMoreExecs.value || execLoading.value) return;
  execLoading.value = true;
  await fetchExecApi();
  const items = execData.value?.data || [];
  allExecutions.value = [...allExecutions.value, ...items];
  hasMoreExecs.value = items.length >= EXEC_LIMIT;
  if (items.length > 0) execCursor.value = items[items.length - 1].id;
  execLoading.value = false;
}

const executions = computed(() => allExecutions.value);

const latestExecDetail = ref<any>(null);
const { data: latestExecData, execute: fetchLatestExecDetail } = useApi(
  () => {
    const latest = allExecutions.value[0];
    if (!latest) return '/enfyra_flow_execution?limit=0';
    return `/enfyra_flow_execution?filter={"${getIdFieldName()}":{"_eq":"${getId(latest)}"}}&fields=id,status,completedSteps,currentStep,error&limit=1`;
  },
  { errorContext: "Fetch Latest Exec Detail" }
);

const latestExecOverlay = computed(() => {
  const detail = latestExecDetail.value;
  if (!detail) return null;
  const raw = (() => {
    const s = detail.completedSteps;
    if (!s) return [];
    if (Array.isArray(s)) return s;
    try { return JSON.parse(s); } catch { return []; }
  })();
  const completedSteps = raw.map((item: any) => typeof item === 'object' ? item.key : item);
  const error = (() => {
    const e = detail.error;
    if (!e) return null;
    if (typeof e === 'string') { try { return JSON.parse(e); } catch { return { message: e }; } }
    return e;
  })();
  return { status: detail.status, completedSteps, currentStep: detail.currentStep, error };
});

async function refreshExecOverlay() {
  await fetchLatestExecDetail();
  if (latestExecData.value?.data?.[0]) {
    latestExecDetail.value = latestExecData.value.data[0];
  }
}

const { execute: updateFlowApi, error: updateError, pending: saveFlowPending } = useApi(() => `/enfyra_flow`, { method: "patch", errorContext: "Update Flow" });

const { checkPermissionCondition } = usePermissions();
const canUpdateFlow = computed(() =>
  checkPermissionCondition({
    and: [{ route: "/enfyra_flow", methods: ["PATCH"] }],
  })
);
const { execute: createStepApi, error: createStepError } = useApi(() => `/enfyra_flow_step`, { method: "post", errorContext: "Create Step" });
const { execute: updateStepApi, error: updateStepError } = useApi(() => `/enfyra_flow_step`, { method: "patch", errorContext: "Update Step" });
const { execute: deleteStepApi, error: deleteStepError } = useApi(() => `/enfyra_flow_step`, { method: "delete", errorContext: "Delete Step" });


registerHeaderActions([
  {
    id: "trigger-flow",
    label: "Run Now",
    icon: "lucide:play",
    variant: "solid",
    color: "success",
    size: "md",
    onClick: triggerFlow,
    permission: { and: [{ route: "/enfyra_flow_execution", methods: ["POST"] }] },
  },
]);

onMounted(async () => {
  await fetchFlow();
  await fetchExecutions();
  await refreshExecOverlay();
  syncEditForm();
  await syncDrawersFromQuery(route.query);
  adminSocket?.on('flow:execution', onFlowExecution);
});

onUnmounted(() => {
  adminSocket?.off('flow:execution', onFlowExecution);
});

function syncEditForm() {
  if (!flow.value) return;
  const { steps: _, ...rest } = flow.value;
  editForm.value = { ...rest };
}

watch(flow, () => syncEditForm());

async function saveFlowSettings() {
  const body = { ...editForm.value };
  delete body.id;
  delete body.steps;
  delete body.createdAt;
  delete body.updatedAt;
  await updateFlowApi({ body, id: flowId });
  if (updateError.value) {
    return;
  }
  notify.success("Success", "Flow settings saved!");
  hasFormChanges.value = false;
  await fetchFlow();
}

const stepDrawerUpdating = ref(false);
const execDrawerUpdating = ref(false);

watch(stepDrawerOpen, (isOpen) => {
  if (stepDrawerUpdating.value) return;
  if (isOpen) {
    router.push({ query: { ...route.query, editStep: editingStepId.value || 'new' } });
  } else {
    const q = { ...route.query };
    delete q.editStep;
    delete q.editStepKey;
    router.replace({ query: q });
  }
});

watch(execDrawerOpen, (isOpen) => {
  if (execDrawerUpdating.value) return;
  if (isOpen && selectedExec.value) {
    router.push({ query: { ...route.query, exec: String(getId(selectedExec.value)) } });
  } else {
    const q = { ...route.query };
    delete q.exec;
    router.replace({ query: q });
  }
});

watch(() => route.query, (q) => {
  void syncDrawersFromQuery(q);
});

function getQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined;
  return value ? String(value) : undefined;
}

async function syncDrawersFromQuery(q: typeof route.query) {
  const editStep = getQueryValue(q.editStep);
  const editStepKey = getQueryValue(q.editStepKey);
  if (editStep || editStepKey) {
    if (editStep === 'new') {
      if (!stepDrawerOpen.value || editingStepId.value !== null) {
        stepDrawerUpdating.value = true;
        openCreateStep();
        nextTick(() => { stepDrawerUpdating.value = false; });
      }
    } else {
      const step = steps.value.find((item: any) =>
        editStepKey
          ? String(item.key) === editStepKey
          : String(getId(item)) === editStep,
      );
      const stepId = step ? String(getId(step)) : undefined;
      if (step && (!stepDrawerOpen.value || String(editingStepId.value) !== stepId)) {
        stepDrawerUpdating.value = true;
        onSelectStep(step);
        nextTick(() => { stepDrawerUpdating.value = false; });
      }
    }
  } else if (stepDrawerOpen.value) {
    stepDrawerUpdating.value = true;
    stepDrawerOpen.value = false;
    const nextQuery = { ...route.query };
    delete nextQuery.editStepKey;
    if ('editStepKey' in route.query) router.replace({ query: nextQuery });
    nextTick(() => { stepDrawerUpdating.value = false; });
  }

  const execId = getQueryValue(q.exec);
  if (execId) {
    const exec = executions.value.find((item: any) => String(getId(item)) === execId) || { [getIdFieldName()]: execId };
    if (!execDrawerOpen.value || !selectedExec.value || String(getId(selectedExec.value)) !== execId) {
      execDrawerUpdating.value = true;
      await openExecution(exec);
      nextTick(() => { execDrawerUpdating.value = false; });
    }
  } else if (execDrawerOpen.value) {
    execDrawerUpdating.value = true;
    execDrawerOpen.value = false;
    nextTick(() => { execDrawerUpdating.value = false; });
  }
}

function onSelectStep(step: any | null) {
  if (!step) return;
  testResult.value = null;
  stepErrors.value = {};
  editingStepId.value = getId(step);
  const rawConfig = step.config && typeof step.config === 'object' ? step.config : {};
  const config = cleanStepConfig(rawConfig);
  const scriptContract = normalizeScriptContract({
    sourceCode: step.sourceCode ?? rawConfig.sourceCode ?? rawConfig.code ?? null,
    scriptLanguage: step.scriptLanguage ?? rawConfig.scriptLanguage,
    compiledCode: step.compiledCode ?? rawConfig.compiledCode ?? null,
  });
  stepForm.value = {
    key: step.key,
    stepOrder: step.stepOrder,
    type: step.type,
    configJson: Object.keys(config).length ? JSON.stringify(config, null, 2) : '',
    sourceCode: scriptContract.sourceCode,
    scriptLanguage: scriptContract.scriptLanguage,
    compiledCode: scriptContract.compiledCode,
    timeout: step.timeout || 5000,
    onError: step.onError || 'stop',
    retryAttempts: step.retryAttempts || 0,
    parentId: step.parentId || step.parent?.id || null,
    branch: step.branch || undefined,
  };
  stepFormSnapshot.value = JSON.stringify(stepForm.value);
  stepDrawerOpen.value = true;
}

function openCreateStep(context?: { parentId?: any; branch?: string; afterOrder?: number }) {
  testResult.value = null;
  stepErrors.value = {};
  editingStepId.value = null;

  let nextOrder: number;
  if (context?.afterOrder !== undefined) {
    nextOrder = context.afterOrder + 1;
  } else {
    const maxOrder = steps.value.reduce((max: number, s: any) => Math.max(max, s.stepOrder || 0), 0);
    nextOrder = maxOrder + 1;
  }

  stepForm.value = {
    key: '',
    stepOrder: nextOrder,
    type: 'script',
    configJson: '',
    sourceCode: null,
    scriptLanguage: 'typescript',
    compiledCode: null,
    timeout: 5000,
    onError: 'stop',
    retryAttempts: 0,
    parentId: context?.parentId || null,
    branch: context?.branch || undefined,
  };
  stepFormSnapshot.value = JSON.stringify(stepForm.value);
  stepDrawerOpen.value = true;
}

async function handleMoveStep(stepId: any, direction: number) {
  if (reordering.value) return;
  reordering.value = true;
  try {
  const sorted = steps.value;
  const current = sorted.find((s: any) => String(getId(s)) === String(stepId));
  if (!current) return;
  const parentId = current.parentId || current.parent?.id || null;
  const branch = current.branch || null;
  const group = sorted.filter((s: any) => {
    const sp = s.parentId || s.parent?.id || null;
    const sb = s.branch || null;
    return String(sp) === String(parentId) && sb === branch;
  });
  const currentIdx = group.findIndex((s: any) => String(getId(s)) === String(stepId));
  if (currentIdx < 0) return;
  const swapIdx = currentIdx + direction;
  if (swapIdx < 0 || swapIdx >= group.length) return;
  const swap = group[swapIdx];
  const currentOrder = current.stepOrder;
  const swapOrder = swap.stepOrder;
  await updateStepApi({ body: { stepOrder: swapOrder }, id: getId(current) });
  await updateStepApi({ body: { stepOrder: currentOrder }, id: getId(swap) });
  await fetchFlow();
  } finally { reordering.value = false; }
}

let testAbortController: AbortController | null = null;

function cancelTest() {
  testAbortController?.abort();
  testAbortController = null;
  testing.value = false;
  testResult.value = { success: false, error: 'Test cancelled', duration: 0 };
}

async function copyTestValue(value: any) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  await navigator.clipboard.writeText(text);
  notify.success("Copied");
}

async function testCurrentStep() {
  let config;
  try {
    config = cleanStepConfig(parseStepConfigJson(stepForm.value.configJson));
  } catch {
    notify.error("Error", "Invalid JSON in config");
    return;
  }
  testing.value = true;
  testResult.value = null;
  testAbortController = new AbortController();
  const testTimeout = setTimeout(() => testAbortController?.abort(), 35000);
  try {
    const { execute: testApi, data: testData, error: testError } = useApi(
      () => `/admin/test/run`,
      { method: "post", errorContext: "Test Step" }
    );
    let mockFlow;
    if (testPayloadJson.value?.trim()) {
      try {
        mockFlow = { $payload: JSON.parse(testPayloadJson.value) };
      } catch {
        testResult.value = { success: false, error: 'Invalid JSON in test payload', duration: 0 };
        testing.value = false;
        return;
      }
    }
    await testApi({
      body: {
        kind: 'flow_step',
        id: editingStepId.value || undefined,
        stepId: editingStepId.value || undefined,
        flowId,
        key: stepForm.value.key,
        type: stepForm.value.type,
        config,
        sourceCode: stepForm.value.sourceCode,
        scriptLanguage: stepForm.value.scriptLanguage,
        compiledCode: stepForm.value.compiledCode,
        timeout: stepForm.value.timeout || 5000,
        mockFlow,
      },
    });
    if (testError.value) {
      testResult.value = { success: false, error: testError.value.message, duration: 0 };
    } else {
      testResult.value = testData.value;
    }
  } finally {
    clearTimeout(testTimeout);
    testAbortController = null;
    testing.value = false;
  }
}

async function saveStep() {
  const currentCodeErrors = {
    ...(stepErrors.value.sourceCode ? { sourceCode: stepErrors.value.sourceCode } : {}),
    ...(stepErrors.value.scriptLanguage ? { scriptLanguage: stepErrors.value.scriptLanguage } : {}),
  };
  stepErrors.value = currentCodeErrors;
  let hasError = false;

  const key = stepForm.value.key?.trim();
  if (!key) {
    stepErrors.value.key = 'Key is required';
    hasError = true;
  } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    stepErrors.value.key = 'Only letters, numbers, underscores. Must start with letter or _';
    hasError = true;
  } else if (!editingStepId.value && steps.value.some((s: any) => s.key === key)) {
    stepErrors.value.key = 'Key already exists';
    hasError = true;
  }
  if (!stepForm.value.type) {
    stepErrors.value.type = 'Type is required';
    hasError = true;
  }

  let config;
  try {
    config = cleanStepConfig(parseStepConfigJson(stepForm.value.configJson));
  } catch {
    stepErrors.value.config = 'Invalid JSON';
    hasError = true;
    config = {};
  }

  if (hasStepErrors.value) {
    return;
  }
  if (hasError) return;

  savingStep.value = true;
  try {
    const body: any = {
      key: stepForm.value.key,
      stepOrder: stepForm.value.stepOrder,
      type: stepForm.value.type,
      config,
      sourceCode: stepForm.value.sourceCode,
      scriptLanguage: stepForm.value.scriptLanguage,
      compiledCode: stepForm.value.compiledCode,
      timeout: stepForm.value.timeout || 5000,
      onError: stepForm.value.onError || 'stop',
      retryAttempts: stepForm.value.retryAttempts || 0,
      isEnabled: true,
      parent: stepForm.value.parentId ? { id: stepForm.value.parentId } : null,
      branch: stepForm.value.parentId ? stepForm.value.branch : null,
    };
    const isEdit = !!editingStepId.value;
    if (editingStepId.value) {
      await updateStepApi({ body, id: editingStepId.value });
      if (updateStepError.value) return;
    } else {
      body.flow = { [getIdFieldName()]: flowId };
      await createStepApi({ body });
      if (createStepError.value) return;
    }
    stepDrawerOpen.value = false;
    await fetchFlow();
  } finally {
    savingStep.value = false;
  }
}

function hasStepChanges(): boolean {
  return JSON.stringify(stepForm.value) !== stepFormSnapshot.value;
}

async function closeStepDrawer() {
  if (hasStepChanges()) {
    const ok = await confirm({ title: 'Discard changes?', content: 'You have unsaved changes. Are you sure you want to close?', confirmText: 'Discard', cancelText: 'Keep editing' });
    if (!ok) return;
  }
  stepDrawerOpen.value = false;
}

function duplicateStep() {
  const maxOrder = steps.value.reduce((max: number, s: any) => Math.max(max, s.stepOrder || 0), 0);
  editingStepId.value = null;
  stepForm.value = {
    ...stepForm.value,
    key: `${stepForm.value.key}_copy`,
    stepOrder: maxOrder + 1,
  };
  stepFormSnapshot.value = JSON.stringify(stepForm.value);
  testResult.value = null;
}

async function deleteCurrentStep() {
  if (!editingStepId.value) return;
  const ok = await confirm({ title: "Delete Step", content: `Delete step "${stepForm.value.key}"?`, confirmText: "Delete", cancelText: "Cancel" });
  if (!ok) return;
  await deleteStepApi({ id: editingStepId.value });
  if (deleteStepError.value) return;
  notify.success("Success", "Step deleted.");
  stepDrawerOpen.value = false;
  await fetchFlow();
}

async function triggerFlow() {
  const { execute: triggerApi, error: triggerError } = useApi(() => `/admin/flow/trigger/${flowId}`, { method: "post", errorContext: "Trigger Flow" });
  await triggerApi({ body: { payload: { trigger: 'manual' } } });
  if (triggerError.value) return;
  notify.success("Flow triggered");
}

function onFlowExecution(data: { flowId?: string | number; status: string; [key: string]: any }) {
  const matchId = String(data.flowId ?? data.flow_id ?? data.id) === String(flowId)
  if (!matchId) return
  if (data.status === 'completed' || data.status === 'failed') {
    refreshExecutions()
  }
}

async function refreshExecutions() {
  execLoading.value = true;
  try {
    await fetchExecutions();
    await refreshExecOverlay();
  } finally {
    execLoading.value = false;
  }
}

const { execute: fetchExecDetail, data: execDetailData } = useApi(
  () => `/enfyra_flow_execution?filter={"${getIdFieldName()}":{"_eq":"${getId(selectedExec.value)}"}}&fields=id,status,startedAt,completedAt,duration,currentStep,completedSteps,error,context&limit=1`,
  { errorContext: "Fetch Execution Detail" }
);

async function rerunExecution() {
  if (!selectedExec.value) return;
  const payload = parsedContext.value?.$payload || {};
  const { execute: triggerApi, error: triggerError } = useApi(() => `/admin/flow/trigger/${flowId}`, { method: "post", errorContext: "Re-run Flow" });
  await triggerApi({ body: { payload } });
  if (triggerError.value) return;
  notify.success("Flow re-triggered");
  execDrawerOpen.value = false;
}

async function openExecution(exec: any) {
  selectedExec.value = exec;
  execDrawerOpen.value = true;
  await fetchExecDetail();
  if (execDetailData.value?.data?.[0]) {
    selectedExec.value = execDetailData.value.data[0];
  }
}

const expandedSteps = ref<Record<string, boolean>>({});

function toggleStepResult(key: string) {
  expandedSteps.value[key] = !expandedSteps.value[key];
}

const parsedContext = computed(() => {
  const ctx = selectedExec.value?.context;
  if (!ctx) return {};
  if (typeof ctx === 'string') { try { return JSON.parse(ctx); } catch { return {}; } }
  return ctx;
});

const parsedError = computed(() => {
  const e = selectedExec.value?.error;
  if (!e) return {};
  if (typeof e === 'string') {
    try { return JSON.parse(e); } catch { return { message: e }; }
  }
  return e;
});

const parsedCompletedSteps = computed(() => {
  const s = selectedExec.value?.completedSteps;
  if (!s) return [];
  if (Array.isArray(s)) return s;
  try { return JSON.parse(s); } catch { return []; }
});

const execStepTimeline = computed(() => {
  const completed = parsedCompletedSteps.value;
  const allSteps = steps.value;
  if (!completed.length && !allSteps.length) return [];

  const isRichFormat = completed.length > 0 && typeof completed[0] === 'object';
  const completedMap = new Map<string, any>();
  if (isRichFormat) {
    for (const entry of completed) completedMap.set(entry.key, entry);
  } else {
    for (const key of completed) completedMap.set(key, { key, type: 'unknown' });
  }

  const failedAt = selectedExec.value?.status === 'failed' ? selectedExec.value?.currentStep : null;
  const flowCompleted = selectedExec.value?.status === 'completed';

  const conditionBranches = new Map<string, string>();
  for (const entry of completedMap.values()) {
    if (entry.type === 'condition' && entry.branch) {
      conditionBranches.set(entry.key, entry.branch);
    }
  }

  const stepIdToKey = new Map<string | number, string>();
  for (const s of allSteps) {
    stepIdToKey.set(String(s.id || getId(s)), s.key);
  }

  const timeline: any[] = [];

  for (const step of allSteps) {
    const entry = completedMap.get(step.key);

    if (entry) {
      timeline.push({
        key: step.key,
        type: isRichFormat ? entry.type : step.type,
        status: entry.status === 'skipped' ? 'skipped' : 'completed',
        branch: entry.branch,
        duration: entry.duration,
        retries: entry.retries,
        error: entry.error,
        reason: entry.status === 'skipped' ? entry.error : undefined,
      });
    } else if (step.key === failedAt) {
      timeline.push({ key: step.key, type: step.type, status: 'failed' });
    } else if (flowCompleted || failedAt) {
      let reason = '';
      const parentId = step.parent?.id || step.parentId;
      if (parentId) {
        const parentKey = stepIdToKey.get(String(parentId));
        if (parentKey) {
          const parentBranch = conditionBranches.get(parentKey);
          if (parentBranch && step.branch && step.branch !== parentBranch) {
            reason = `Condition "${parentKey}" returned ${parentBranch}`;
          }
        }
      }
      timeline.push({ key: step.key, type: step.type, status: 'skipped', reason });
    }
  }

  return timeline;
});

function formatJson(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
  }
  return JSON.stringify(val, null, 2);
}
</script>
