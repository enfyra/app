<template>
  <CommonDrawer
    v-model="drawerOpen"
    direction="right"
    full-width
    :danger-action="editing ? { label: 'Delete', icon: 'lucide:trash-2', tone: 'danger', variant: 'soft', onClick: () => emit('delete') } : false"
    :leading-actions="editing ? [{ label: 'Duplicate', icon: 'i-lucide-copy', variant: 'soft', onClick: () => emit('duplicate') }] : []"
    :cancel-action="{ label: 'Cancel', onClick: () => emit('close') }"
    :primary-action="{ label: editing ? 'Save changes' : 'Create step', loading: saving, disabled: hasErrors, onClick: () => emit('save') }"
  >
    <template #header>
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--state-primary-soft-bg-hover)] text-[var(--md-primary)]">
          <UIcon :name="stepIcon" class="h-4 w-4" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <h3 class="truncate text-lg font-semibold text-[var(--text-primary)]">
              {{ editing ? `Edit ${form.key || 'step'}` : 'New flow step' }}
            </h3>
            <UBadge :color="stepColor" variant="soft" size="sm">
              {{ stepTypeLabel }}
            </UBadge>
          </div>
          <div class="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span class="truncate">{{ editing ? 'Configure, test, and save this step.' : 'Choose a step type, configure it, then create it.' }}</span>
            <template v-if="form.parentId">
              <span class="text-[var(--text-quaternary)]">/</span>
              <UBadge color="secondary" variant="soft" size="xs">{{ conditionLabel }}</UBadge>
              <UBadge :color="form.branch === 'true' ? 'success' : 'error'" variant="soft" size="xs">
                {{ form.branch === 'true' ? 'True' : 'False' }}
              </UBadge>
            </template>
          </div>
        </div>
      </div>
    </template>

    <template #body>
      <div class="flex h-full min-h-0 flex-col">
        <div class="px-4 pt-4">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            :content="false"
            variant="link"
            :ui="{ list: 'border-b-0', indicator: '!-bottom-px' }"
          />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <section v-if="activeTab === 'setup'" class="space-y-5">
            <div class="space-y-2">
              <div class="text-sm font-semibold text-[var(--text-primary)]">Step type</div>
              <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <button
                  v-for="option in stepTypeOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'flex min-h-[76px] items-start gap-3 rounded-[var(--radius-panel)] border p-3 text-left transition-colors',
                    form.type === option.value
                      ? 'border-[var(--state-primary-outline-border)] bg-[var(--state-primary-soft-bg)] text-[var(--text-primary)]'
                      : 'border-[var(--border-default)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-default)]',
                  ]"
                  @click="updateField('type', option.value)"
                >
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-subcontrol)] bg-[var(--surface-default)] text-[var(--md-primary)]">
                    <UIcon :name="getStepTypeIcon(option.value)" class="h-4 w-4" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold">{{ option.label }}</span>
                    <span class="mt-1 block text-xs text-[var(--text-tertiary)]">{{ stepTypeDescriptions[option.value] }}</span>
                  </span>
                </button>
              </div>
              <p v-if="errors.type" class="text-xs text-[var(--form-error-text)]">{{ errors.type }}</p>
            </div>

            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <UFormField label="Key" required class="w-full" :error="errors.key">
                <UInput :model-value="form.key" placeholder="e.g. check_user" class="w-full" @update:model-value="updateField('key', $event)" />
                <template #hint>
                  <span class="text-[10px]">Reference via <code class="rounded bg-[var(--surface-muted)] px-1">@FLOW.{{ form.key || 'key' }}</code></span>
                </template>
              </UFormField>
              <div class="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
                <div class="text-xs font-medium text-[var(--text-tertiary)]">Execution order</div>
                <div class="mt-1 text-lg font-semibold text-[var(--text-primary)]">#{{ form.stepOrder }}</div>
              </div>
            </div>

            <div v-if="usesBackendScriptFields" class="space-y-2">
              <FlowStepConfigEditor
                :type="form.type"
                :config-json="form.configJson"
                :source-code="form.sourceCode"
                :script-language="form.scriptLanguage"
                :errors="errors"
                @update:config-json="updateConfigJson"
                @update:source-code="updateSourceCode"
                @update:script-language="updateScriptLanguage"
                @update:errors="emit('update:errors', $event)"
              />
            </div>

            <div
              v-else
              class="rounded-[var(--radius-card)] border bg-[var(--surface-default)] p-4"
              :class="hasConfigErrors ? 'border-[var(--control-invalid-border)] ring-1 ring-[var(--control-invalid-ring)]' : 'border-[var(--border-default)]'"
            >
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">Configuration</div>
                  <div class="text-xs text-[var(--text-tertiary)]">Main behavior for this step.</div>
                </div>
                <UBadge v-if="hasConfigErrors" color="error" variant="outline" size="sm">Needs attention</UBadge>
              </div>
              <p v-if="errors.config" class="mb-2 text-xs text-[var(--form-error-text)]">{{ errors.config }}</p>
              <p v-else-if="errors.sourceCode" class="mb-2 text-xs text-[var(--form-error-text)]">{{ errors.sourceCode }}</p>
              <FlowStepConfigEditor
                :type="form.type"
                :config-json="form.configJson"
                :source-code="form.sourceCode"
                :script-language="form.scriptLanguage"
                :errors="errors"
                @update:config-json="updateConfigJson"
                @update:source-code="updateSourceCode"
                @update:script-language="updateScriptLanguage"
                @update:errors="emit('update:errors', $event)"
              />
            </div>
          </section>

          <section v-else-if="activeTab === 'behavior'" class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
              <div class="mb-4">
                <div class="text-sm font-semibold text-[var(--text-primary)]">Runtime behavior</div>
                <div class="text-xs text-[var(--text-tertiary)]">Control timeout and error handling for this step.</div>
              </div>
              <div class="space-y-4">
                <UFormField label="Timeout" class="w-full">
                  <UInput :model-value="form.timeout" type="number" class="w-full" @update:model-value="updateNumberField('timeout', $event)">
                    <template #trailing><span class="text-xs text-[var(--text-quaternary)]">ms</span></template>
                  </UInput>
                </UFormField>
                <div :class="form.onError === 'retry' ? 'grid grid-cols-2 gap-3' : ''">
                  <UFormField label="On Error" class="w-full">
                    <USelect :model-value="form.onError" :items="errorOptions" value-key="value" class="w-full" @update:model-value="updateField('onError', $event)" />
                  </UFormField>
                  <UFormField v-if="form.onError === 'retry'" label="Retries" class="w-full">
                    <UInput :model-value="form.retryAttempts" type="number" placeholder="3" class="w-full" @update:model-value="updateNumberField('retryAttempts', $event)" />
                  </UFormField>
                </div>
              </div>
            </div>

            <div class="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
              <div class="mb-4">
                <div class="text-sm font-semibold text-[var(--text-primary)]">Condition branch</div>
                <div class="text-xs text-[var(--text-tertiary)]">Attach this step under a condition branch when needed.</div>
              </div>
              <div v-if="conditionStepOptions.length > 1" class="space-y-4">
                <UFormField label="Attach to Condition" class="w-full">
                  <USelect :model-value="form.parentId" :items="conditionStepOptions" value-key="value" class="w-full" placeholder="None (root level)" @update:model-value="updateField('parentId', $event)" />
                </UFormField>
                <UFormField v-if="form.parentId" label="Execute when" class="w-full">
                  <USelect :model-value="form.branch" :items="branchOptions" value-key="value" class="w-full" @update:model-value="updateField('branch', $event)" />
                </UFormField>
              </div>
              <CommonEmptyState v-else variant="naked" icon="lucide:git-branch" title="No condition steps" description="Create a condition step before attaching branch children." />
            </div>
          </section>

          <section v-else class="grid min-h-full gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div class="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
              <div class="mb-4">
                <div class="text-sm font-semibold text-[var(--text-primary)]">Test input</div>
                <div class="text-xs text-[var(--text-tertiary)]">Run this step with a draft payload before saving the flow.</div>
              </div>
              <UFormField label="Payload JSON" class="w-full">
                <UTextarea :model-value="testPayloadJson" :rows="8" class="w-full font-mono text-xs" placeholder='{"orderId": 123, "email": "test@test.com"}' @update:model-value="emit('update:testPayloadJson', String($event ?? ''))" />
                <template #hint>
                  <span class="text-[10px]">Accessible via <code class="rounded bg-[var(--surface-muted)] px-1">@FLOW_PAYLOAD</code> in step code.</span>
                </template>
              </UFormField>
              <div class="mt-4 flex justify-end">
                <UButton
                  v-if="!testing"
                  color="warning"
                  variant="solid"
                  icon="i-lucide-flask-conical"
                  @click="emit('test')"
                >
                  Run test
                </UButton>
                <UButton v-else color="error" variant="soft" icon="i-lucide-x" @click="emit('cancel-test')">
                  Cancel test
                </UButton>
              </div>
            </div>

            <div class="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">Test output</div>
                  <div class="text-xs text-[var(--text-tertiary)]">Inspect the result, logs, and emitted events.</div>
                </div>
                <UBadge v-if="testResult" :color="testResult.success ? 'success' : 'error'" variant="soft" size="sm">
                  {{ testResult.success ? 'Passed' : 'Failed' }}
                </UBadge>
              </div>

              <div v-if="testing" class="flex min-h-[260px] items-center justify-center">
                <CommonLoadingState type="dots" size="md" />
              </div>
              <CommonEmptyState v-else-if="!testResult" variant="naked" icon="lucide:flask-conical" title="No test run yet" description="Run the step to preview the output." />
              <div v-else class="space-y-3">
                <div class="flex items-center gap-2">
                  <UIcon :name="testResult.success ? 'i-lucide-check-circle' : 'i-lucide-x-circle'" :class="testResult.success ? 'text-[var(--st-success)]' : 'text-[var(--md-error)]'" class="h-4 w-4" />
                  <span class="text-xs font-medium" :class="testResult.success ? 'text-[var(--st-success)]' : 'text-[var(--md-error)]'">
                    {{ testResult.success ? 'Test passed' : 'Test failed' }} ({{ testResult.duration || 0 }}ms)
                  </span>
                </div>
                <div v-if="testResult.error" class="rounded-[var(--radius-panel)] border border-[var(--state-danger-outline-border)] bg-[var(--state-danger-soft-bg)] p-3 text-xs text-[var(--state-danger-soft-text)]">
                  {{ testResult.error }}
                </div>
                <FlowStepTestOutput v-else title="Result" :value="testResult.result" @copy="emit('copy-test-value', $event)" />
                <FlowStepTestOutput v-if="testResult.logs?.length" title="Logs" :value="testResult.logs" @copy="emit('copy-test-value', $event)" />
                <FlowStepTestOutput v-if="testResult.emitted?.length" title="Emitted" :value="testResult.emitted" @copy="emit('copy-test-value', $event)" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </CommonDrawer>
</template>

<script setup lang="ts">
import type { BadgeColor } from '~/utils/flow.constants';
import type { FlowStepEditorForm, StepErrorHandling, StepType } from '~/types/flow';
import { getStepTypeColor, getStepTypeIcon } from '~/utils/flow.constants';

type StepEditorTab = 'setup' | 'behavior' | 'test';

const props = defineProps<{
  modelValue: boolean;
  form: FlowStepEditorForm;
  editing: boolean;
  saving: boolean;
  testing: boolean;
  hasErrors: boolean;
  hasConfigErrors: boolean;
  errors: Record<string, string>;
  stepTypeOptions: { label: string; value: StepType }[];
  errorOptions: { label: string; value: StepErrorHandling }[];
  conditionStepOptions: { label: string; value: any }[];
  conditionLabel?: string;
  testPayloadJson: string;
  testResult: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: FlowStepEditorForm];
  'update:errors': [value: Record<string, string>];
  'update:testPayloadJson': [value: string];
  close: [];
  save: [];
  delete: [];
  duplicate: [];
  test: [];
  'cancel-test': [];
  'copy-test-value': [value: any];
}>();

const activeTab = ref<StepEditorTab>('setup');

const tabs = [
  { label: 'Setup', value: 'setup' as const, icon: 'lucide:settings-2' },
  { label: 'Behavior', value: 'behavior' as const, icon: 'lucide:sliders-horizontal' },
  { label: 'Test', value: 'test' as const, icon: 'lucide:flask-conical' },
];

const branchOptions = [
  { label: 'Condition is True', value: 'true' },
  { label: 'Condition is False', value: 'false' },
];

const stepTypeDescriptions: Record<StepType, string> = {
  script: 'Run custom TypeScript or JavaScript.',
  condition: 'Branch based on a truthy or falsy result.',
  query: 'Read records from a table.',
  delete: 'Delete a record by id.',
  http: 'Call an external HTTP endpoint.',
  trigger_flow: 'Start another flow asynchronously.',
  sleep: 'Pause execution for a duration.',
  log: 'Write a message to execution output.',
};

const drawerOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit('update:modelValue', true);
      return;
    }
    if (props.modelValue) {
      emit('close');
    }
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (value) activeTab.value = 'setup';
  },
);

watch(
  () => [props.errors.key, props.errors.type, props.errors.config, props.errors.sourceCode, props.errors.scriptLanguage],
  (messages) => {
    if (messages.some(Boolean)) activeTab.value = 'setup';
  },
);

const stepTypeLabel = computed(() => props.stepTypeOptions.find(option => option.value === props.form.type)?.label || props.form.type);
const stepIcon = computed(() => getStepTypeIcon(props.form.type));
const stepColor = computed<BadgeColor>(() => getStepTypeColor(props.form.type));
const usesBackendScriptFields = computed(() => props.form.type === 'script' || props.form.type === 'condition');

function updateField<K extends keyof FlowStepEditorForm>(field: K, value: FlowStepEditorForm[K]) {
  emit('update:form', { ...props.form, [field]: value });
}

function updateNumberField(field: 'timeout' | 'retryAttempts', value: unknown) {
  const parsed = Number(value);
  updateField(field, Number.isFinite(parsed) ? parsed : 0);
}

function updateConfigJson(value: string) {
  emit('update:form', { ...props.form, configJson: value });
  emit('update:errors', { ...props.errors, config: '' });
}

function updateSourceCode(value: string | null) {
  emit('update:form', { ...props.form, sourceCode: value, compiledCode: null });
  emit('update:errors', { ...props.errors, config: '' });
}

function updateScriptLanguage(value: 'javascript' | 'typescript') {
  emit('update:form', { ...props.form, scriptLanguage: value, compiledCode: null });
}
</script>
