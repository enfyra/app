export function useFileManagerSelection() {
  const isSelectionMode = ref(false);
  const selectedItems = ref<string[]>([]);

  function toggleItemSelection(itemId: string) {
    const index = selectedItems.value.indexOf(itemId);
    if (index > -1) {
      selectedItems.value.splice(index, 1);
    } else {
      selectedItems.value.push(itemId);
    }
  }

  function clearSelection() {
    selectedItems.value = [];
    isSelectionMode.value = false;
  }

  function selectAllItems(allItems: any[]) {
    selectedItems.value = allItems.map(item => item.id);
  }

  function deselectAllItems() {
    selectedItems.value = [];
  }

  const hasSelection = computed(() => selectedItems.value.length > 0);

  return {
    isSelectionMode,
    selectedItems,
    toggleItemSelection,
    clearSelection,
    selectAllItems,
    deselectAllItems,
    hasSelection,
  };
}