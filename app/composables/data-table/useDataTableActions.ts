import { shallowRef, type MaybeRefOrGetter, type Ref } from 'vue';

export function useDataTableActions<TRow>(
  tableName: MaybeRefOrGetter<string>,
  fetchData: () => Promise<void>,
  data: Ref<TRow[]>
) {
  const selectedRows = shallowRef<TRow[]>([]);
  const isSelectionMode = ref(false);

  const notify = useNotify();
  const { confirm } = useConfirm();
  const { createLoader } = useLoader();
  const { getId } = useDatabase();
  const { hasPermission } = usePermissions();

  const canDelete = computed(() =>
    hasPermission(`/${toValue(tableName)}`, 'DELETE')
  );

  const { executeWithResult: executeDelete } = useApi(
    () => `/${toValue(tableName)}`,
    {
      method: "delete",
      errorContext: "Delete Record",
    }
  );

  async function handleDelete(id: string) {
    const result = await confirm({
      title: "Delete Record",
      content: "Are you sure you want to delete this record?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!result) return;

    const deleteLoader = createLoader();

    await deleteLoader.withLoading(async () => {
      const outcome = await executeDelete({ id });
      if (!outcome.ok) return;

      notify.success("Success", "Record deleted successfully");
      await fetchData();
    });
  }

  function handleSelectionChange(rows: TRow[]) {
    selectedRows.value = rows;

    if (isSelectionMode.value && data.value.length === 0) {
      isSelectionMode.value = false;
    }
  }

  function resetSelection() {
    selectedRows.value = [];
    isSelectionMode.value = false;
  }

  async function handleBulkDelete(rows: TRow[]) {
    const result = await confirm({
      title: "Delete Records",
      content: `Are you sure you want to delete ${rows.length} record(s)?`,
      confirmText: "Delete All",
      cancelText: "Cancel",
    });

    if (!result) return;

    const deleteLoader = createLoader();

    await deleteLoader.withLoading(async () => {
      const ids = rows.map((row) => getId(row));

      const outcome = await executeDelete({ ids });
      if (!outcome.ok) return;

      notify.success("Success", `${rows.length} record(s) deleted successfully`);

      resetSelection();
      await fetchData();
    });
  }

  return {
    selectedRows,
    isSelectionMode,
    canDelete,
    handleDelete,
    handleBulkDelete,
    handleSelectionChange,
    resetSelection,
  };
}
