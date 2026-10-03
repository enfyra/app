import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileManagerSelection } from '../../app/composables/file-manager/useFileManagerSelection';

afterEach(() => vi.unstubAllGlobals());

describe('file-manager selection mode', () => {
  it('clears checked items without leaving selection mode and exits on the next toggle', () => {
    vi.stubGlobal('ref', ref);
    vi.stubGlobal('computed', (getter: () => boolean) => ({ get value() { return getter(); } }));
    const selection = useFileManagerSelection();

    selection.toggleSelectionMode();
    selection.toggleItemSelection('file-id');
    selection.deselectAllItems();
    expect(selection.isSelectionMode.value).toBe(true);
    expect(selection.selectedItems.value).toEqual([]);

    selection.toggleItemSelection('folder-id');
    selection.toggleSelectionMode();
    expect(selection.isSelectionMode.value).toBe(false);
    expect(selection.selectedItems.value).toEqual([]);
  });
});
