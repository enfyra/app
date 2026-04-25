<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <div v-if="!isMounted || loading" class="w-full max-w-[1000px] space-y-6">
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

      <div v-else-if="flow" class="w-full max-w-[1000px] space-y-6">
        <CommonFormCard>
          <UForm :state="editForm" @submit="saveFlowSettings">
            <FormEditorLazy
              v-model="editForm"
              :table-name="'flow_definition'"
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

        <CommonFormCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-[var(--text-primary)]">Recent Executions</h3>
              <UButton icon="i-lucide-refresh-cw" size="sm" variant="solid" color="neutral" :loading="execLoading" @click="refreshExecutions">Reload</UButton>
            </div>
          </template>
          <div v-if="executions.length > 0" class="space-y-2 p-4">
            <div
              v-for="exec in executions"
              :key="exec.id"
              class="flex items-center justify-between p-3 bg-[var(--surface-muted)] rounded-lg text-sm cursor-pointer hover:bg-[var(--surface-muted)] transition-colors"
              @click="openExecution(exec)"
            >
              <div class="flex items-center gap-3">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDotClass(exec.status)" />
                <UBadge :color="getStatusColor(exec.status)" variant="soft" size="xs">{{ exec.status }}</UBadge>
                <span class="text-[var(--text-tertiary)] text-xs">{{ formatTime(exec.startedAt) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="exec.duration" class="text-[var(--text-quaternary)] text-xs font-mono">{{ exec.duration }}ms</span>
                <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-[var(--text-quaternary)]" />
              </div>
            </div>
          </div>
          <div v-if="hasMoreExecs && executions.length > 0" class="px-4 pb-4">
            <UButton variant="ghost" color="neutral" block @click="loadMoreExecutions" :loading="execLoading">
              Load More
            </UButton>
          </div>
          <p v-else-if="executions.length === 0" class="text-sm text-[var(--text-quaternary)] text-center py-8">No executions yet. Click "Run Now" to trigger this flow.</p>
        </CommonFormCard>
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

          <div class="p-3 rounded-lg border" :class="stepErrors.config ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800' : 'bg-[var(--surface-muted)] border-[var(--border-default)]'">
            <p v-if="stepErrors.config" class="text-xs text-red-500 mb-2">{{ stepErrors.config }}</p>
            <FlowStepConfigEditor
              :type="stepForm.type"
              :config-json="stepForm.configJson"
              @update:config-json="stepForm.configJson = $event; stepErrors.config = ''"
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
              <UIcon :name="testResult.success ? 'i-lucide-check-circle' : 'i-lucide-x-circle'" :class="testResult.success ? 'text-green-500' : 'text-red-500'" class="w-4 h-4" />
              <span class="text-xs font-medium" :class="testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ testResult.success ? 'Test passed' : 'Test failed' }} ({{ testResult.duration }}ms)
              </span>
            </div>
            <div v-if="testResult.error" class="p-2 rounded bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400 break-words">{{ testResult.error }}</div>
            <pre v-else-if="testResult.result !== undefined" class="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-secondary)] overflow-auto max-h-[200px] whitespace-pre-wrap">{{ JSON.stringify(testResult.result, null, 2) }}</pre>
          </div>
          <div class="flex gap-2 w-full p-4 border-t border-[var(--border-default)]">
            <UButton v-if="editingStepId" color="error" variant="soft" @click="deleteCurrentStep">Delete</UButton>
            <UButton v-if="editingStepId" variant="soft" icon="i-lucide-copy" @click="duplicateStep">Duplicate</UButton>
            <UButton v-if="!testing" color="warning" variant="soft" icon="i-lucide-flask-conical" @click="testCurrentStep">Test</UButton>
            <UButton v-else color="error" variant="soft" icon="i-lucide-x" @click="cancelTest">Cancel</UButton>
            <div class="flex-1" />
            <UButton variant="ghost" color="error" @click="closeStepDrawer">Cancel</UButton>
            <UButton color="primary" @click="saveStep" :loading="savingStep">
              {{ editingStepId ? 'Update' : 'Create' }}
            </UButton>
          </div>
        </div>
      </template>
    </CommonDrawer>

    <CommonDrawer v-model="execDrawerOpen" direction="right">
      <template #header>
        <div class="flex items-center gap-3 w-full">
          <h3 class="text-lg font-semibold">Execution Detail</h3>
          <UBadge v-if="selectedExec" :color="getStatusColor(selectedExec.status)" variant="soft">{{ selectedExec.status }}</UBadge>
        </div>
      </template>
      <template #body>
        <div v-if="selectedExec" class="p-4 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
              <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Status</p>
              <UBadge :color="getStatusColor(selectedExec.status)" variant="soft">{{ selectedExec.status }}</UBadge>
            </div>
            <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
              <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Duration</p>
              <p class="text-sm font-mono">{{ selectedExec.duration ? `${selectedExec.duration}ms` : '-' }}</p>
            </div>
            <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
              <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Started</p>
              <p class="text-xs">{{ formatTime(selectedExec.startedAt) }}</p>
            </div>
            <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
              <p class="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Completed</p>
              <p class="text-xs">{{ formatTime(selectedExec.completedAt) }}</p>
            </div>
          </div>

          <div v-if="selectedExec.status === 'failed' && selectedExec.currentStep" class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 space-y-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-red-500 flex-shrink-0" />
              <p class="text-sm font-semibold text-red-700 dark:text-red-300">
                Failed at step: <span class="font-bold">{{ selectedExec.currentStep }}</span>
              </p>
            </div>
            <p v-if="parsedError.message" class="text-sm text-red-600 dark:text-red-400 break-words pl-6">{{ parsedError.message }}</p>
            <pre v-if="parsedError.stack" class="text-[10px] text-red-500/80 dark:text-red-400/60 overflow-x-auto max-h-[120px] whitespace-pre-wrap pl-6">{{ parsedError.stack }}</pre>
          </div>

          <div v-else-if="selectedExec.currentStep && selectedExec.status === 'running'" class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <p class="text-sm text-blue-700 dark:text-blue-300">Running step: <span class="font-semibold">{{ selectedExec.currentStep }}</span></p>
            </div>
          </div>

          <div v-if="execStepTimeline.length > 0" class="space-y-2">
            <p class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Steps</p>
            <div v-for="s in execStepTimeline" :key="s.key" class="p-2 rounded-lg border" :class="stepTimelineClass(s)">
              <div class="flex items-center gap-2 cursor-pointer" @click="toggleStepResult(s.key)">
                <UIcon :name="stepTimelineIcon(s)" class="w-3.5 h-3.5 flex-shrink-0" :class="stepTimelineIconColor(s)" />
                <span class="text-xs font-medium flex-1" :class="s.status === 'skipped' ? 'text-[var(--text-quaternary)]' : ''">{{ s.key }}</span>
                <UBadge v-if="s.type === 'condition' && s.branch" :color="s.branch === 'true' ? 'success' : 'error'" variant="soft" size="xs">{{ s.branch }}</UBadge>
                <UBadge v-if="s.status === 'skipped'" color="neutral" variant="soft" size="xs">skipped</UBadge>
                <UBadge v-if="s.retries" color="warning" variant="soft" size="xs">{{ s.retries }} retries</UBadge>
                <span v-if="s.duration" class="text-[10px] font-mono text-[var(--text-quaternary)]">{{ s.duration }}ms</span>
                <UIcon v-if="parsedContext[s.key]" :name="expandedSteps[s.key] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-3 h-3 text-[var(--text-quaternary)]" />
              </div>
              <p v-if="s.status === 'skipped' && s.reason" class="text-[10px] text-[var(--text-quaternary)] mt-1 pl-5">{{ s.reason }}</p>
              <pre v-if="expandedSteps[s.key] && parsedContext[s.key]" class="mt-1 p-2 rounded bg-[var(--surface-muted)] text-[10px] font-mono text-[var(--text-tertiary)] overflow-auto max-h-[120px] whitespace-pre-wrap">{{ JSON.stringify(parsedContext[s.key], null, 2) }}</pre>
            </div>
          </div>
          <UButton v-if="selectedExec?.status === 'failed'" color="primary" variant="soft" icon="i-lucide-rotate-ccw" block class="mt-3" @click="rerunExecution">
            Re-run with same payload
          </UButton>
        </div>
      </template>
    </CommonDrawer>
  </div>
</template>

<script setup lang="ts">
import type { StepType, StepErrorHandling } from '~/types/flow';
import { STEP_TYPE_OPTIONS, ERROR_OPTIONS, getExecutionStatusColor, getExecutionStatusDotClass, getStepTimelineIcon, getStepTimelineIconColor, getStepTimelineClass } from '~/utils/flow.constants';

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
  timeout: 5000,
  onError: 'stop' as StepErrorHandling,
  retryAttempts: 0,
  parentId: null as any,
  branch: undefined as string | undefined,
});

watch(() => stepForm.value.key, () => {
  if (stepErrors.value.key) stepErrors.value.key = '';
});
watch(() => stepForm.value.type, () => {
  if (stepErrors.value.type) stepErrors.value.type = '';
});

registerPageHeader({ title: "Flow Editor", gradient: "purple" });

const { data: flowData, pending: loading, execute: fetchFlow } = useApi(
  () => `/flow_definition?filter={"${getIdFieldName()}":{"_eq":"${flowId}"}}&fields=*,steps.*,steps.parent.id&limit=1`,
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
    return `/flow_execution_definition?filter=${JSON.stringify(filter)}&sort=-id&limit=${EXEC_LIMIT}&fields=${EXEC_FIELDS}`;
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
    if (!latest) return '/flow_execution_definition?limit=0';
    return `/flow_execution_definition?filter={"${getIdFieldName()}":{"_eq":"${getId(latest)}"}}&fields=id,status,completedSteps,currentStep,error&limit=1`;
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

const { execute: updateFlowApi, error: updateError, pending: saveFlowPending } = useApi(() => `/flow_definition`, { method: "patch", errorContext: "Update Flow" });

const { checkPermissionCondition } = usePermissions();
const canUpdateFlow = computed(() =>
  checkPermissionCondition({
    and: [{ route: "/flow_definition", actions: ["update"] }],
  })
);
const { execute: createStepApi, error: createStepError } = useApi(() => `/flow_step_definition`, { method: "post", errorContext: "Create Step" });
const { execute: updateStepApi, error: updateStepError } = useApi(() => `/flow_step_definition`, { method: "patch", errorContext: "Update Step" });
const { execute: deleteStepApi, error: deleteStepError } = useApi(() => `/flow_step_definition`, { method: "delete", errorContext: "Delete Step" });


useSubHeaderActionRegistry([
  {
    id: "trigger-flow",
    label: "Run Now",
    icon: "lucide:play",
    variant: "solid",
    color: "success",
    size: "md",
    onClick: triggerFlow,
    permission: { and: [{ route: "/flow_execution_definition", actions: ["create"] }] },
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
  if (editStep) {
    if (editStep === 'new') {
      if (!stepDrawerOpen.value || editingStepId.value !== null) {
        stepDrawerUpdating.value = true;
        openCreateStep();
        nextTick(() => { stepDrawerUpdating.value = false; });
      }
    } else {
      const step = steps.value.find((item: any) => String(getId(item)) === editStep);
      if (step && (!stepDrawerOpen.value || String(editingStepId.value) !== editStep)) {
        stepDrawerUpdating.value = true;
        onSelectStep(step);
        nextTick(() => { stepDrawerUpdating.value = false; });
      }
    }
  } else if (stepDrawerOpen.value) {
    stepDrawerUpdating.value = true;
    stepDrawerOpen.value = false;
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
  stepForm.value = {
    key: step.key,
    stepOrder: step.stepOrder,
    type: step.type,
    configJson: step.config ? JSON.stringify(step.config, null, 2) : '',
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

async function testCurrentStep() {
  let config;
  try {
    config = stepForm.value.configJson ? JSON.parse(stepForm.value.configJson) : {};
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
    await testApi({ body: { kind: 'flow_step', type: stepForm.value.type, config, timeout: stepForm.value.timeout || 5000, mockFlow } });
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
  stepErrors.value = {};
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
    config = stepForm.value.configJson ? JSON.parse(stepForm.value.configJson) : {};
  } catch {
    stepErrors.value.config = 'Invalid JSON';
    hasError = true;
    config = {};
  }

  if (hasError) return;
  savingStep.value = true;
  try {
    const body: any = {
      key: stepForm.value.key,
      stepOrder: stepForm.value.stepOrder,
      type: stepForm.value.type,
      config,
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

function getStatusColor(status: string) {
  return getExecutionStatusColor(status);
}

function statusDotClass(status: string) {
  return getExecutionStatusDotClass(status);
}

function formatTime(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  () => `/flow_execution_definition?filter={"${getIdFieldName()}":{"_eq":"${getId(selectedExec.value)}"}}&fields=id,status,startedAt,completedAt,duration,currentStep,completedSteps,error,context&limit=1`,
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

function stepTimelineIcon(s: any): string {
  return getStepTimelineIcon(s);
}

function stepTimelineIconColor(s: any): string {
  return getStepTimelineIconColor(s);
}

function stepTimelineClass(s: any): string {
  return getStepTimelineClass(s);
}

function formatJson(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
  }
  return JSON.stringify(val, null, 2);
}
</script>
