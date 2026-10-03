import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileManager } from '../../app/composables/file-manager/useFileManager';

afterEach(() => vi.unstubAllGlobals());

function setup(confirmed: boolean, fileSucceeds = true) {
  const confirm = vi.fn().mockResolvedValue(confirmed);
  const folderDelete = vi.fn().mockResolvedValue({ ok: true });
  const fileDelete = vi.fn().mockResolvedValue({ ok: fileSucceeds });
  vi.stubGlobal('ref', ref);
  vi.stubGlobal('useConfirm', () => ({ confirm }));
  vi.stubGlobal('useNotify', () => ({ success: vi.fn(), warning: vi.fn() }));
  vi.stubGlobal('useDatabase', () => ({ getId: (record: Record<string, unknown>) => record.id ?? record._id }));
  vi.stubGlobal('useApi', (url: () => string) => ({ execute: vi.fn(), error: ref(null), executeWithResult: url().includes('folder') ? folderDelete : fileDelete }));
  return { manager: useFileManager(), confirm, folderDelete, fileDelete };
}

describe('mixed file-manager deletion', () => {
  it('cancels the whole selection without executing either delete endpoint', async () => {
    const { manager, confirm, folderDelete, fileDelete } = setup(false);
    const result = await manager.deleteSelectedItems([{ id: 12 }], ['34']);
    expect(confirm).toHaveBeenCalledOnce();
    expect(folderDelete).not.toHaveBeenCalled();
    expect(fileDelete).not.toHaveBeenCalled();
    expect(result.cancelled).toBe(true);
    expect(result.deletedFolderIds).toEqual([]);
    expect(result.deletedFileIds).toEqual([]);
  });

  it('reports completed folders while retaining a failed file and unattempted items', async () => {
    const { manager, confirm, folderDelete, fileDelete } = setup(true, false);
    const result = await manager.deleteSelectedItems([{ id: 12 }], ['34', '56']);
    expect(confirm).toHaveBeenCalledOnce();
    expect(folderDelete).toHaveBeenCalledWith({ id: '12' });
    expect(fileDelete).toHaveBeenCalledOnce();
    expect(fileDelete).toHaveBeenCalledWith({ id: '34' });
    expect(result).toEqual({ cancelled: false, failed: true, deletedFolderIds: ['12'], deletedFileIds: [] });
  });
});
