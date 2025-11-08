
export function useDataTableActions(
  tableName: string,
  fetchData: () => Promise<void>,
  data: Ref<any[]>
) {
  const selectedRows = ref<any[]>([]);
  const isSelectionMode = ref(false);

  const toast = useToast();
  const { confirm } = useConfirm();
  const { createLoader } = useLoader();
  const { getId } = useDatabase();

  const { execute: executeDelete, error: deleteError } = useApi(
    () => `/${tableName}`,
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
      await executeDelete({ id });

      if (deleteError.value) {
        return;
      }

      toast.add({
        title: "Success",
        description: "Record deleted successfully",
        color: "success",
      });
      await fetchData();
    });
  }

  function handleSelectionChange(rows: any[]) {
    selectedRows.value = rows;

    if (isSelectionMode.value && data.value.length === 0) {
      isSelectionMode.value = false;
    }
  }

  async function handleBulkDelete(rows: any[]) {
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

      await executeDelete({ ids });

      if (deleteError.value) {
        return;
      }

      toast.add({
        title: "Success",
        description: `${rows.length} record(s) deleted successfully`,
        color: "success",
      });

      selectedRows.value = [];
      await fetchData();
    });
  }

  return {
    selectedRows,
    isSelectionMode,
    handleDelete,
    handleBulkDelete,
    handleSelectionChange,
  };
}
