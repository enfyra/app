import { computed, ref, watch } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileManagerUpload } from '../../app/composables/file-manager/useFileManagerUpload';

afterEach(() => vi.unstubAllGlobals());

describe('shared file-manager upload', () => {
  it('keeps per-file progress headers and folder context without treating an aborted upload as success', async () => {
    const executeWithResult = vi.fn().mockResolvedValue({ ok: false, error: null, aborted: true });
    const onUploaded = vi.fn();
    const success = vi.fn();
    let uploadIndex = 0;
    vi.stubGlobal('ref', ref);
    vi.stubGlobal('computed', computed);
    vi.stubGlobal('watch', watch);
    vi.stubGlobal('useNotify', () => ({ success }));
    vi.stubGlobal('useDatabase', () => ({ getId: (record: Record<string, unknown>) => record.id }));
    vi.stubGlobal('useGlobalState', () => ({ storageConfigs: ref([]), storageConfigsFetched: ref(true), storageConfigsPending: ref(false), storageConfigsError: ref(null), fetchStorageConfigs: vi.fn() }));
    vi.stubGlobal('useApi', () => ({ executeWithResult, pending: ref(false) }));
    vi.stubGlobal('useFileUploadProgress', () => ({
      trackedUploadProgressById: ref({}),
      beginTrackedUploadProgress: () => `upload-${++uploadIndex}`,
      getUploadProgressHeaders: (id: string) => ({ 'x-enfyra-upload-id': id }),
      resetUploadProgress: vi.fn(),
    }));
    const upload = useFileManagerUpload({ folderId: () => 'folder-id', onUploaded });
    const file = new Blob(['file']) as File;
    await upload.handleFileUpload([file, file]);

    const request = executeWithResult.mock.calls[0]?.[0];
    expect(request.files.map((form: FormData) => form.get('folder'))).toEqual(['folder-id', 'folder-id']);
    expect(request.headersByIndex).toEqual({ 0: { 'x-enfyra-upload-id': 'upload-1' }, 1: { 'x-enfyra-upload-id': 'upload-2' } });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });
});
