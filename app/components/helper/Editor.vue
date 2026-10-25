<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSharedHelperEditor } from '~/composables/helper/useSharedHelperEditor';
import { buildSharedHelperFieldMap } from '~/utils/form/shared-helper';
import type { SharedHelperEditorOptions } from '~/types/shared-helper';

const props = defineProps<SharedHelperEditorOptions>();
const { form, errors, ready, loadFailed, saving, deleting, testing, dirty, busy, canWrite, canDelete, canTest, invocation, testInput, testInputError, testResult, load, save, reset, deleteHelper, runTest } = useSharedHelperEditor(() => ({ mode: props.mode, ...(props.id === undefined ? {} : { id: props.id }) }));
const tab = ref('editor');
const helperReloadAction = useReloadAction({
  reload: async () => {
    await load();
  },
  loading: busy,
  hasUnsavedChanges: () => dirty.value,
});
const helperTitle = computed(() =>
  props.mode === 'create'
    ? 'Create Helper'
    : ready.value && form.value.name
      ? `Helper: ${form.value.name}`
      : 'Helper Editor',
);
const sections = computed(() => {
  const sectionHeader = {
    title: helperTitle.value,
    description: 'Reusable code for handlers, hooks and flows.',
    ...(props.mode === 'update' ? { actions: [helperReloadAction] } : {}),
  };
  return [
    { value: 'editor', label: 'Editor', icon: 'lucide:code', ...sectionHeader },
    { value: 'usage', label: 'Usage', icon: 'lucide:book-open', ...sectionHeader },
    ...(canTest.value ? [{ value: 'test', label: 'Test', icon: 'lucide:play', ...sectionHeader }] : []),
  ];
});
const fieldMap = computed(() => {
  const fields = buildSharedHelperFieldMap(!canWrite.value || busy.value);
  return { ...fields, sourceCode: { ...fields.sourceCode, disabled: false, componentProps: { readonly: !canWrite.value || busy.value } } };
});
const formSections = [
  { id: 'details', title: 'Details', fields: ['name', 'description', 'isEnabled', 'scriptLanguage'] },
  { id: 'source', title: 'Implementation', fields: ['sourceCode'] },
];
const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();
const writePermission = { and: [{ route: '/enfyra_helper', methods: [props.mode === 'create' ? 'POST' : 'PATCH'] }] };
registerHeaderActions([
  { id: 'helper-reset', label: 'Reset', icon: 'lucide:rotate-ccw', variant: 'outline', color: 'warning', onClick: reset, show: computed(() => tab.value === 'editor' && dirty.value), disabled: busy, order: 1 },
  { id: 'helper-delete', label: 'Delete', icon: 'lucide:trash-2', variant: 'outline', color: 'error', onClick: deleteHelper, show: computed(() => props.mode === 'update' && canDelete.value), loading: deleting, disabled: computed(() => !ready.value || busy.value && !deleting.value), permission: { and: [{ route: '/enfyra_helper', methods: ['DELETE'] }] }, order: 2 },
  { id: 'helper-save', label: props.mode === 'create' ? 'Create Helper' : 'Save', icon: 'lucide:save', variant: 'solid', color: 'primary', onClick: save, show: computed(() => tab.value === 'editor'), loading: saving, disabled: computed(() => !ready.value || busy.value && !saving.value || props.mode === 'update' && !dirty.value), permission: writePermission, order: 999 },
]);

async function copyValue(value: unknown) {
  try {
    await navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? 'undefined');
    notify.success('Copied');
  } catch { notify.error('Copy failed', 'Select and copy the text manually.'); }
}
</script>

<template>
  <div class="min-w-0 space-y-6">
    <CommonEmptyState v-if="loadFailed" title="Helper unavailable" description="The helper could not be loaded. Check your access or try again." icon="lucide:code" variant="naked">
      <UButton color="neutral" variant="outline" icon="lucide:refresh-cw" @click="load">Try again</UButton>
    </CommonEmptyState>
    <CommonPanel v-else v-model="tab" :sections="sections">
      <template #editor>
        <div v-if="!ready" class="space-y-5" aria-busy="true" aria-label="Loading helper">
          <USkeleton class="h-9 w-full" />
          <USkeleton class="h-20 w-full" />
          <USkeleton class="h-9 w-40" />
          <USkeleton class="h-80 w-full" />
        </div>
        <CommonFormCard v-else :bordered="false">
          <UForm :state="form" @submit="save">
            <FormEditorLazy v-model="form" v-model:errors="errors" table-name="enfyra_helper" :mode="props.mode" v-bind="props.id === undefined ? {} : { currentRecordId: props.id }" :includes="['name', 'description', 'isEnabled', 'scriptLanguage', 'sourceCode']" :field-map="fieldMap" :sections="formSections" />
          </UForm>
        </CommonFormCard>
      </template>
      <template #usage>
        <div class="space-y-5">
          <FlowStepTestOutput title="Call by name" :value="invocation" @copy="copyValue" />
          <div class="space-y-2 text-sm text-[var(--text-secondary)]">
            <p>The helper receives only the supplied data through <code>@PARAMS</code>. Caller body, query, user, shared data and local variables are not copied into its context.</p>
            <p>Use normal script macros such as <code>#table</code> and return your result. Helpers can call other helpers with <code>await @HELPERS.run(name, params)</code>.</p>
            <p>Calls share the task's capabilities and deadline. Inside <code>@TRANSACTION.run</code>, helper repository calls join that transaction; an uncaught failure rolls back both caller and helper writes. External side effects are not rolled back.</p>
            <p>Helpers do not execute another route's guards, hooks or triggers.</p>
            <p>Renaming or deleting a helper breaks callers using its name. Keep unfinished helpers disabled.</p>
          </div>
        </div>
      </template>
      <template #test>
        <div class="space-y-5">
          <UAlert color="warning" variant="soft" icon="lucide:triangle-alert" title="Tests run real code" description="This executes the current draft as your signed-in user for up to five seconds. Database writes and external calls are not automatically rolled back. Nested helper calls use saved, activated definitions." />
          <UFormField label="Params" description="JSON available inside the helper as @PARAMS." :error="testInputError">
            <FormCodeEditorLazy v-model="testInput" language="json" height="200px" :test-run="false" :readonly="busy" />
          </UFormField>
          <UButton icon="lucide:play" color="primary" :loading="testing" :disabled="!ready || !canTest || busy && !testing || !form.sourceCode.trim()" @click="runTest">Run draft</UButton>
          <div v-if="testResult" class="space-y-4" aria-live="polite">
            <UBadge :color="testResult.success ? 'success' : 'error'" variant="soft">{{ testResult.success ? 'Passed' : 'Failed' }}</UBadge>
            <FlowStepTestOutput v-if="testResult.success" title="Result" :value="testResult.result" @copy="copyValue" />
            <FlowStepTestOutput v-else title="Error" :value="testResult.error" @copy="copyValue" />
            <FlowStepTestOutput v-if="testResult.logs?.length" title="Logs" :value="testResult.logs" @copy="copyValue" />
          </div>
        </div>
      </template>
    </CommonPanel>
  </div>
</template>
