import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ mounted: [] as Array<() => void>, cleanup: [] as Array<() => void>, leave: undefined as undefined | (() => Promise<boolean>), allowed: true, confirm: vi.fn(), write: vi.fn(), read: vi.fn(), remove: vi.fn(), test: vi.fn(), cancel: vi.fn(), notify: vi.fn(), navigate: vi.fn() }));
vi.mock('vue', async importOriginal => ({ ...await importOriginal<typeof import('vue')>(), onMounted: (fn: () => void) => state.mounted.push(fn), onBeforeUnmount: (fn: () => void) => state.cleanup.push(fn) }));
vi.mock('vue-router', () => ({ onBeforeRouteLeave: (fn: () => Promise<boolean>) => { state.leave = fn; } }));
vi.mock('../../app/composables/shared/usePermissions', () => ({ usePermissions: () => ({ checkPermissionCondition: () => state.allowed }) }));
vi.mock('../../app/composables/shared/useConfirm', () => ({ useConfirm: () => ({ confirm: state.confirm }) }));
vi.mock('../../app/composables/shared/useNotify', () => ({ useNotify: () => ({ success: state.notify, error: state.notify }) }));
vi.mock('../../app/composables/shared/useApi', () => ({ useApi: (url: string, options: { method?: string }) => ({
  executeWithResult: url === '/admin/test/run' ? state.test : options.method === 'delete' ? state.remove : options.method ? state.write : state.read,
  cancel: state.cancel,
}) }));
mockNuxtImport('useSchema', () => () => ({ ensureSchema: async () => undefined }));
mockNuxtImport('useFormValidation', () => () => ({ validateForm: async () => true }));
mockNuxtImport('useDatabase', () => () => ({ getId: (record: { id?: number }) => record?.id }));
mockNuxtImport('navigateTo', () => state.navigate);
import { useSharedHelperEditor } from '../../app/composables/helper/useSharedHelperEditor';

beforeEach(() => {
  vi.clearAllMocks(); state.mounted = []; state.cleanup = []; state.leave = undefined; state.allowed = true;
  state.confirm.mockResolvedValue(true);
  state.read.mockResolvedValue({ ok: true, data: { data: [{ id: 7, name: 'search', isEnabled: true, sourceCode: 'return @PARAMS;' }] } });
  state.write.mockResolvedValue({ ok: true, data: { data: [{ id: 7 }] } });
  state.remove.mockResolvedValue({ ok: true });
  state.test.mockResolvedValue({ ok: true, data: { success: true, result: 42 } });
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => { state.cleanup.forEach(fn => fn()); vi.unstubAllGlobals(); });

async function setup() {
  const editor = useSharedHelperEditor({ mode: 'update', id: '7' });
  await editor.load();
  return editor;
}

describe('dedicated shared helper editor', () => {
  it('starts creation with an empty disabled draft and resets back to empty source', async () => {
    const editor = useSharedHelperEditor({ mode: 'create' });
    await editor.load();
    expect(editor.form.value.sourceCode).toBe('');
    expect(editor.form.value.isEnabled).toBe(false);
    expect(editor.dirty.value).toBe(false);
    expect(state.read).not.toHaveBeenCalled();
    editor.form.value.sourceCode = 'return @PARAMS;';
    await editor.reset();
    expect(editor.form.value.sourceCode).toBe('');
    expect(editor.dirty.value).toBe(false);
  });
  it('loads only editable source fields and saves a clean canonical payload', async () => {
    const editor = await setup();
    expect(editor.ready.value).toBe(true); expect(editor.dirty.value).toBe(false);
    editor.form.value.sourceCode = 'return @PARAMS.query;';
    await editor.save();
    expect(state.write).toHaveBeenCalledWith({ id: '7', body: { name: 'search', description: '', isEnabled: true, scriptLanguage: 'typescript', sourceCode: 'return @PARAMS.query;' } });
    expect(editor.dirty.value).toBe(false);
    expect(state.read.mock.calls[0][0].query.fields).not.toContain('compiledCode');
  });
  it('preserves the draft after a failed save', async () => {
    const editor = await setup(); editor.form.value.name = 'draft_name';
    state.write.mockResolvedValue({ ok: false, aborted: false });
    await editor.save();
    expect(editor.form.value.name).toBe('draft_name'); expect(editor.dirty.value).toBe(true); expect(editor.busy.value).toBe(false);
  });
  it('serializes a pending save and blocks route transitions', async () => {
    const editor = await setup(); editor.form.value.name = 'changed';
    let finish!: (value: unknown) => void; state.write.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = editor.save(); await vi.waitFor(() => expect(state.write).toHaveBeenCalledOnce());
    await editor.save(); expect(state.write).toHaveBeenCalledOnce(); expect(await state.leave!()).toBe(false);
    finish({ ok: true, data: { data: [{ id: 7 }] } }); await pending;
  });
  it('guards dirty browser-history navigation and reset through confirmation', async () => {
    const editor = await setup(); editor.form.value.name = 'changed'; state.confirm.mockResolvedValue(false);
    expect(await state.leave!()).toBe(false); await editor.reset(); expect(editor.form.value.name).toBe('changed');
    state.confirm.mockResolvedValue(true); await editor.reset(); expect(editor.form.value.name).toBe('search'); expect(editor.dirty.value).toBe(false);
  });
  it('denies save, delete and test when the caller lacks permissions', async () => {
    const editor = await setup(); state.allowed = false; editor.form.value.name = 'changed';
    await editor.save(); await editor.deleteHelper(); await editor.runTest();
    expect(state.write).not.toHaveBeenCalled(); expect(state.remove).not.toHaveBeenCalled(); expect(state.test).not.toHaveBeenCalled();
  });
  it('rejects invalid names without losing draft source', async () => {
    const editor = await setup(); editor.form.value.name = 'Bad name';
    await editor.save(); expect(editor.errors.value.name).toBeTruthy(); expect(state.write).not.toHaveBeenCalled(); expect(editor.form.value.sourceCode).toBe('return @PARAMS;');
  });
  it.each(['null', 'false', '0', '[1,2]'])('passes JSON input %s without rewriting null or scalar values', async text => {
    const editor = await setup(); editor.testInput.value = text; await editor.runTest();
    const payload = state.test.mock.calls[0][0].body;
    expect(payload.body).toEqual({ params: JSON.parse(text) }); expect(payload.timeoutMs).toBe(5000);
    expect(payload.script).toContain('$params: @BODY.params'); expect(payload).not.toHaveProperty('user');
    expect(editor.testResult.value?.result).toBe(42);
  });
  it('does not run invalid JSON or auto-save a tested draft', async () => {
    const editor = await setup(); editor.testInput.value = '{broken'; await editor.runTest();
    expect(editor.testInputError.value).toBeTruthy(); expect(state.test).not.toHaveBeenCalled(); expect(state.write).not.toHaveBeenCalled();
  });
  it('rejects late load commits after lifecycle cleanup', async () => {
    const editor = useSharedHelperEditor({ mode: 'update', id: '7' });
    let finish!: (value: unknown) => void; state.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = editor.load(); await vi.waitFor(() => expect(state.read).toHaveBeenCalled()); state.cleanup.forEach(fn => fn());
    finish({ ok: true, data: { data: [{ name: 'stale' }] } }); await pending;
    expect(editor.ready.value).toBe(false); expect(editor.form.value.name).not.toBe('stale'); expect(state.cancel).toHaveBeenCalled();
  });
});
