import { computed, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileManagerMove } from '../../app/composables/file-manager/useFileManagerMove';

beforeEach(() => {
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('useState', (_key: string, create: () => unknown) => ref(create()));
  vi.stubGlobal('useRoute', () => ({ params: {} }));
  vi.stubGlobal('useDatabase', () => ({ getId: (record: Record<string, unknown>) => record.id ?? record._id }));
  vi.stubGlobal('useConfirm', () => ({ confirm: vi.fn() }));
  vi.stubGlobal('useNotify', () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
  vi.stubGlobal('useApi', () => ({ execute: vi.fn(), error: ref(null), pending: ref(false) }));
});

afterEach(() => vi.unstubAllGlobals());

describe('file-manager destination selection', () => {
  it('retains numeric SQL item ids selected through native string checkbox keys', () => {
    const manager = useFileManagerMove();
    manager.startMoveMode(['12', '34'], [{ id: 12 }], [{ id: 34 }]);

    expect(manager.moveState.value.selectedFolderIds).toEqual(['12']);
    expect(manager.moveState.value.selectedFileIds).toEqual(['34']);
    expect(manager.isMoveHereDisabled()).toBe(true);
    expect(manager.isMoveHereDisabled('56')).toBe(false);
  });

  it('retains MongoDB ids while browsing another destination', () => {
    const manager = useFileManagerMove();
    manager.startMoveMode(['folder-id', 'file-id'], [{ _id: 'folder-id' }], [{ _id: 'file-id' }], 'source-id');

    expect(manager.moveState.value.selectedFolderIds).toEqual(['folder-id']);
    expect(manager.moveState.value.selectedFileIds).toEqual(['file-id']);
    expect(manager.isMoveHereDisabled('source-id')).toBe(true);
    expect(manager.isMoveHereDisabled()).toBe(false);
  });
});
