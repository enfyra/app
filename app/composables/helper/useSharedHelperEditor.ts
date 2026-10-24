import { computed, onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useApi } from '~/composables/shared/useApi';
import { useConfirm } from '~/composables/shared/useConfirm';
import { usePermissions } from '~/composables/shared/usePermissions';
import { useNotify } from '~/composables/shared/useNotify';
import { buildHelperInvocation, buildHelperTestScript, normalizeSharedHelperForm, validateSharedHelperForm } from '~/utils/form/shared-helper';
import type { SharedHelperEditorOptions, SharedHelperListResponse, SharedHelperTestResponse } from '~/types/shared-helper';

export function useSharedHelperEditor(optionsSource: MaybeRefOrGetter<SharedHelperEditorOptions>) {
  const options = computed(() => toValue(optionsSource));
  const { confirm } = useConfirm();
  const notify = useNotify();
  const { checkPermissionCondition } = usePermissions();
  const { ensureSchema } = useSchema('enfyra_helper');
  const { validateForm } = useFormValidation('enfyra_helper');
  const { getId } = useDatabase();
  const form = ref(normalizeSharedHelperForm({ isEnabled: false }));
  const errors = ref<Record<string, string>>({});
  const original = ref('');
  const ready = ref(false);
  const loadFailed = ref(false);
  const saving = ref(false);
  const deleting = ref(false);
  const resetting = ref(false);
  const testing = ref(false);
  const testInput = ref('{\n  "query": "Search terms"\n}');
  const testInputError = ref('');
  const testResult = ref<SharedHelperTestResponse | null>(null);
  let active = true;
  let generation = 0;
  let allowLeave = false;
  const canWrite = computed(() => checkPermissionCondition({ and: [{ route: '/enfyra_helper', methods: [options.value.mode === 'create' ? 'POST' : 'PATCH'] }] }));
  const canDelete = computed(() => options.value.mode === 'update' && checkPermissionCondition({ and: [{ route: '/enfyra_helper', methods: ['DELETE'] }] }));
  const canTest = computed(() => canWrite.value && checkPermissionCondition({ and: [{ route: '/admin/test/run', methods: ['POST'] }] }));
  const dirty = computed(() => ready.value && JSON.stringify(form.value) !== original.value);
  const busy = computed(() => saving.value || deleting.value || resetting.value || testing.value);
  const invocation = computed(() => buildHelperInvocation(form.value.name || 'helper_name'));
  const { executeWithResult: fetchRecord, cancel: cancelRead } = useApi<SharedHelperListResponse>('/enfyra_helper', { immediate: false, errorContext: 'Load Helper' });
  const { executeWithResult: write } = useApi<SharedHelperListResponse>('/enfyra_helper', { method: options.value.mode === 'create' ? 'post' : 'patch', errorContext: 'Save Helper' });
  const { executeWithResult: remove } = useApi('/enfyra_helper', { method: 'delete', errorContext: 'Delete Helper' });
  const { executeWithResult: executeTest, cancel: cancelTest } = useApi<SharedHelperTestResponse>('/admin/test/run', { method: 'post', errorContext: 'Test Helper' });

  async function load() {
    if (busy.value) return;
    const token = ++generation;
    ready.value = false;
    loadFailed.value = false;
    try {
      await ensureSchema();
      if (!active || token !== generation) return;
      if (options.value.mode === 'update') {
        if (!options.value.id) { loadFailed.value = true; return; }
        const result = await fetchRecord({ id: options.value.id, query: { fields: 'id,name,description,isEnabled,scriptLanguage,sourceCode', limit: 1 } });
        if (!active || token !== generation) return;
        if (!result.ok || !result.data.data?.[0]) { loadFailed.value = true; return; }
        form.value = normalizeSharedHelperForm(result.data.data[0]);
      }
      original.value = JSON.stringify(form.value);
      ready.value = true;
    } catch {
      if (active && token === generation) loadFailed.value = true;
    }
  }

  async function save() {
    if (!ready.value || !canWrite.value || busy.value || (options.value.mode === 'update' && !dirty.value)) return;
    saving.value = true;
    try {
      errors.value = {};
      const schemaValid = await validateForm(form.value, errors);
      errors.value = { ...errors.value, ...validateSharedHelperForm(form.value) };
      if (!schemaValid || Object.keys(errors.value).length) return;
      const body = normalizeSharedHelperForm(form.value);
      const result = await write({ ...(options.value.mode === 'update' && options.value.id !== undefined ? { id: options.value.id } : {}), body: { ...body } });
      if (!active || !result.ok) return;
      const record = result.data?.data?.[0];
      const id = options.value.mode === 'create' ? getId(record) : options.value.id;
      if (id == null || String(id) === '') { notify.error('Save incomplete', 'The response did not include the saved helper. Reload before submitting again.'); return; }
      form.value = body;
      original.value = JSON.stringify(body);
      testResult.value = null;
      notify.success(options.value.mode === 'create' ? 'Helper created' : 'Helper saved');
      if (options.value.mode === 'create') {
        allowLeave = true;
        await navigateTo(`/settings/helpers/${encodeURIComponent(String(id))}`, { replace: true });
      }
    } finally { if (active) saving.value = false; }
  }

  async function reset() {
    if (!dirty.value || busy.value) return;
    resetting.value = true;
    try {
      if (!await confirm({ title: 'Discard changes?', content: 'Restore the last saved helper and discard your edits?', confirmText: 'Discard', cancelText: 'Keep editing' }) || !active) return;
      form.value = JSON.parse(original.value);
      errors.value = {};
      testResult.value = null;
    } finally { if (active) resetting.value = false; }
  }

  async function deleteHelper() {
    if (!canDelete.value || busy.value || !ready.value) return;
    deleting.value = true;
    try {
      if (!await confirm({ title: 'Delete helper?', content: `Delete "${form.value.name}"? Scripts calling this name will fail. This action cannot be undone.`, confirmText: 'Delete', cancelText: 'Cancel' }) || !active) return;
      const result = await remove(options.value.id === undefined ? {} : { id: options.value.id });
      if (!result.ok || !active) return;
      allowLeave = true;
      notify.success('Helper deleted');
      await navigateTo('/settings/helpers');
    } finally { if (active) deleting.value = false; }
  }

  async function runTest() {
    if (!ready.value || !canTest.value || busy.value || !form.value.sourceCode.trim()) return;
    testInputError.value = '';
    let params: unknown;
    try { params = JSON.parse(testInput.value); } catch { testInputError.value = 'Enter valid JSON. Objects, arrays and scalar values are supported.'; return; }
    testing.value = true;
    testResult.value = null;
    try {
      const result = await executeTest({ body: { kind: 'script', script: buildHelperTestScript(form.value.sourceCode), scriptLanguage: form.value.scriptLanguage, body: { params }, timeoutMs: 5000 } });
      if (!active) return;
      testResult.value = result.ok ? result.data : { success: false, error: { message: result.error?.message ?? 'Test request failed' } };
    } finally { if (active) testing.value = false; }
  }

  watch([form, testInput], () => { if (!testing.value) testResult.value = null; }, { deep: true });
  const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = ''; } };
  onBeforeRouteLeave(async () => {
    if (allowLeave) return true;
    if (busy.value) return false;
    return !dirty.value || await confirm({ title: 'Discard changes?', content: 'You have unsaved helper changes.', confirmText: 'Discard', cancelText: 'Keep editing' });
  });
  onMounted(() => { window.addEventListener('beforeunload', beforeUnload); void load(); });
  onBeforeUnmount(() => { active = false; generation++; cancelRead(); cancelTest(); window.removeEventListener('beforeunload', beforeUnload); });
  return { form, errors, ready, loadFailed, saving, deleting, testing, dirty, busy, canWrite, canDelete, canTest, invocation, testInput, testInputError, testResult, load, save, reset, deleteHelper, runTest };
}
