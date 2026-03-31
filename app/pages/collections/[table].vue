<script setup lang="ts">
const route = useRoute();
const { schemas, fetchSchema, forceRefreshSchema, schemaLoading } = useSchema();
const { confirm } = useConfirm();
const toast = useToast();
const { registerDataMenuItems } = useMenuRegistry();
const { loadRoutes } = useRoutes();
const { retryUntilFresh } = useServerSync();
const { getId } = useDatabase();
const tableName = "table_definition";
const { getIncludeFields } = useSchema(tableName);
const { isMobile, isTablet } = useScreen();
const { isMounted } = useMounted();

const table = ref<any>();
const schemaConfirmModalOpen = ref(false);
const schemaConfirmMode = ref<'update' | 'delete'>('update');
const schemaConfirmDetails = ref<any>(null);
const schemaConfirmInput = ref('');
const schemaConfirmLoading = ref(false);

const hasFormChanges = ref(false);
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();
const { registerPageHeader } = usePageHeaderRegistry();

watch(() => table.value?.name, (name) => {
  if (name) {
    registerPageHeader({
      title: `Edit Table: ${name}`,
      gradient: "purple",
    });
  }
}, { immediate: true });

const {
  data: tableData,
  pending: loading,
  execute: fetchTableData,
} = useApi(() => "/table_definition", {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: {
      name: {
        _eq: route.params.table,
      },
    },
  })),
  errorContext: "Fetch Table Data",
});

const {
  data: patchTableData,
  pending: saving,
  execute: executePatchTable,
  error: updateError,
} = useApi(() => `/table_definition`, {
  method: "patch",
  errorContext: "Update Table",
  onError: (e: any) => e?.data?.code === 'SCHEMA_CONFIRM_REQUIRED',
});

const {
  pending: deleting,
  execute: executeDeleteTable,
  error: deleteError,
} = useApi(() => `/table_definition`, {
  method: "delete",
  errorContext: "Delete Table",
  onError: (e: any) => e?.data?.code === 'SCHEMA_CONFIRM_REQUIRED',
});

useHeaderActionRegistry([
  {
    id: "reset-table",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(
      () =>
        schemaLoading.value ||
        saving.value ||
        deleting.value ||
        !hasFormChanges.value
    ),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-table",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    order: 2,
    loading: computed(() => deleting.value),
    disabled: computed(
      () =>
        (table.value?.isSystem &&
          !isSystemTableModifiable(table.value?.name)) ||
        schemaLoading.value ||
        saving.value
    ),
    onClick: handleDelete,
    permission: {
      and: [
        {
          route: "/table_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-table",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    order: 999,
    loading: computed(() => saving.value || schemaLoading.value),
    disabled: computed(
      () =>
        (table.value?.isSystem &&
          !isSystemTableModifiable(table.value?.name)) ||
        schemaLoading.value ||
        deleting.value ||
        !hasFormChanges.value
    ),
    submit: save,
    permission: {
      and: [
        {
          route: "/table_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

const showSchemaViewer = ref(false);

useSubHeaderActionRegistry([
  {
    id: "view-schema",
    label: "View Schema",
    icon: "lucide:database",
    variant: "solid",
    color: "secondary",
    size: "md",
    onClick: () => (showSchemaViewer.value = true),
  },
]);

async function initializeForm() {
  await fetchTableData();
  const data = tableData.value?.data?.[0];
  if (data) {
    table.value = data;
    formChanges.update(data); 
    hasFormChanges.value = false;
  }
}

async function save() {
  const isChangingToSingleRecord =
    formChanges.originalData.value?.isSingleRecord === false &&
    table.value?.isSingleRecord === true;

  if (isChangingToSingleRecord) {
    schemaConfirmMode.value = 'update';
    schemaConfirmDetails.value = {
      tableName: table.value?.name,
      warning: "Changing to single record mode will keep only the first record. All other records will be automatically deleted.",
    };
    schemaConfirmInput.value = '';
    schemaConfirmModalOpen.value = true;
    return;
  } else {
    schemaConfirmMode.value = 'update';
    schemaConfirmDetails.value = { tableName: table.value?.name };
    schemaConfirmInput.value = '';
    schemaConfirmModalOpen.value = true;
    return;
  }
}

async function patchTable() {
  await executePatchTable({ id: getId(table.value), body: table.value });

  if (updateError.value?.data?.code === 'SCHEMA_CONFIRM_REQUIRED') {
    schemaConfirmMode.value = 'update';
    schemaConfirmDetails.value = updateError.value?.data?.details || {};
    schemaConfirmInput.value = '';
    schemaConfirmModalOpen.value = true;
  }

  if (updateError.value) {
    return;
  }
  await afterPatchSuccess();
}

async function afterPatchSuccess() {
  const expectedUpdatedAt = patchTableData.value?.data?.[0]?.updatedAt;
  const targetTableName = String(route.params.table);

  await retryUntilFresh(
    () => forceRefreshSchema(),
    () => {
      if (!expectedUpdatedAt) return false;
      const cached = schemas.value[targetTableName];
      return !cached?.updatedAt || new Date(cached.updatedAt) < new Date(expectedUpdatedAt);
    }
  );

  await loadRoutes();
  registerDataMenuItems(Object.values(schemas.value));

  await fetchTableData();
  const updatedData = tableData.value?.data?.[0];
  if (updatedData) {
    table.value = updatedData;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Table structure updated!",
  });

  formChanges.update(table.value);
  hasFormChanges.value = false;
}

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    table.value = formChanges.discardChanges(table.value);
    hasFormChanges.value = false;
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

async function handleDelete() {
  schemaConfirmMode.value = 'delete';
  schemaConfirmDetails.value = { tableName: table.value?.name };
  schemaConfirmInput.value = '';
  schemaConfirmModalOpen.value = true;
}

async function deleteTable() {
  const deletedTableName = String(route.params.table);
  await executeDeleteTable({ id: getId(table.value) });

  if (deleteError.value?.data?.code === 'SCHEMA_CONFIRM_REQUIRED') {
    schemaConfirmMode.value = 'delete';
    schemaConfirmDetails.value = deleteError.value?.data?.details || {};
    schemaConfirmInput.value = '';
    schemaConfirmModalOpen.value = true;
  }

  if (deleteError.value) {
    return;
  }

  await retryUntilFresh(
    () => forceRefreshSchema(),
    () => !!schemas.value[deletedTableName]
  );

  await loadRoutes();
  registerDataMenuItems(Object.values(schemas.value));

  toast.add({
    title: "Success",
    color: "success",
    description: "Table deleted!",
  });
  return navigateTo(`/collections`);
}

async function afterDeleteSuccess(deletedTableName: string) {
  await retryUntilFresh(
    () => forceRefreshSchema(),
    () => !!schemas.value[deletedTableName]
  );

  await loadRoutes();
  registerDataMenuItems(Object.values(schemas.value));

  toast.add({
    title: "Success",
    color: "success",
    description: "Table deleted!",
  });
  await navigateTo(`/collections`);
}

const schemaConfirmExpectedTableName = computed(() =>
  String(schemaConfirmDetails.value?.tableName || table.value?.name || ''),
);

const isSchemaConfirmDestructive = computed(() => {
  if (schemaConfirmMode.value === 'delete') return true;
  if (schemaConfirmDetails.value?.requiredConfirmHash) return true;
  if (modalRemovedColumns.value.length > 0) return true;
  if (modalRemovedRelationsCount.value > 0) return true;
  if (schemaConfirmDetails.value?.warning) return true;
  return false;
});

const schemaConfirmBadgeText = computed(() => {
  if (schemaConfirmMode.value === 'delete') return 'Destructive';
  if (!isSchemaConfirmDestructive.value) return 'Safe';
  const removedCols = modalRemovedColumns.value.length;
  const removedRels = modalRemovedRelationsCount.value;
  const parts: string[] = [];
  if (removedCols > 0) parts.push(`Drop ${removedCols} column${removedCols > 1 ? 's' : ''}`);
  if (removedRels > 0) parts.push(`Drop ${removedRels} relation${removedRels > 1 ? 's' : ''}`);
  return parts.length ? parts.join(' · ') : 'Destructive';
});

const schemaConfirmSubtitle = computed(() => {
  if (schemaConfirmMode.value === 'delete') return 'Type the table name to proceed.';
  if (isSchemaConfirmDestructive.value) {
    const removedCols = modalRemovedColumns.value.length;
    const removedRels = modalRemovedRelationsCount.value;
    if (removedCols || removedRels) {
      return 'Destructive change detected (drops). Please review carefully.';
    }
    return 'Destructive change detected. Please review carefully.';
  }
  return 'No destructive drops detected. Confirm to apply changes.';
});

async function copyConfirmHash() {
  const hash = schemaConfirmDetails.value?.requiredConfirmHash;
  if (!hash) return;
  try {
    await navigator.clipboard.writeText(String(hash));
    toast.add({
      title: "Copied",
      color: "success",
      description: "Confirm hash copied to clipboard",
    });
  } catch {
  }
}

type TLocalSchemaDiff = {
  removedColumns: string[];
  addedColumns: string[];
  renamedColumns: Array<{ from: string; to: string }>;
  changedColumns: Array<{ name: string; before: any; after: any }>;
  removedRelations: string[];
  addedRelations: string[];
  removedUniques: string[];
  addedUniques: string[];
  removedIndexes: string[];
  addedIndexes: string[];
};

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const localDiff = computed<TLocalSchemaDiff>(() => {
  const before = formChanges.originalData.value || {};
  const after = table.value || {};
  const beforeCols = Array.isArray(before.columns) ? before.columns : [];
  const afterCols = Array.isArray(after.columns) ? after.columns : [];
  const beforeRels = Array.isArray(before.relations) ? before.relations : [];
  const afterRels = Array.isArray(after.relations) ? after.relations : [];
  const beforeUniques = Array.isArray(before.uniques) ? before.uniques : [];
  const afterUniques = Array.isArray(after.uniques) ? after.uniques : [];
  const beforeIndexes = Array.isArray(before.indexes) ? before.indexes : [];
  const afterIndexes = Array.isArray(after.indexes) ? after.indexes : [];

  const normalizeCol = (c: any) => ({
    key: String(c?._id ?? c?.id ?? c?.name ?? ''),
    name: c?.name ?? '',
    type: c?.type ?? '',
    isNullable: c?.isNullable ?? true,
    isPrimary: !!c?.isPrimary,
    isGenerated: !!c?.isGenerated,
    defaultValue: c?.defaultValue ?? null,
  });
  const byKey = (arr: any[]) => new Map(arr.map((c: any) => [normalizeCol(c).key, normalizeCol(c)]));
  const bColMap = byKey(beforeCols);
  const aColMap = byKey(afterCols);

  const removedColumns = Array.from(bColMap.keys())
    .filter((k) => k && !aColMap.has(k))
    .map((k) => bColMap.get(k)?.name)
    .filter(isNonEmptyString);
  const addedColumns = Array.from(aColMap.keys())
    .filter((k) => k && !bColMap.has(k))
    .map((k) => aColMap.get(k)?.name)
    .filter(isNonEmptyString);

  const renamedColumns = Array.from(aColMap.keys())
    .filter((k) => k && bColMap.has(k))
    .map((k) => ({
      from: bColMap.get(k)?.name,
      to: aColMap.get(k)?.name,
    }))
    .filter((x): x is { from: string; to: string } => isNonEmptyString(x.from) && isNonEmptyString(x.to) && x.from !== x.to);

  const changedColumns = Array.from(aColMap.keys())
    .filter((k) => k && bColMap.has(k))
    .filter((k) => {
      const b = bColMap.get(k);
      const a = aColMap.get(k);
      if (!b || !a) return false;
      const bCopy = { ...b, name: '' };
      const aCopy = { ...a, name: '' };
      return JSON.stringify(bCopy) !== JSON.stringify(aCopy);
    })
    .map((k) => ({ name: aColMap.get(k)?.name, before: bColMap.get(k), after: aColMap.get(k) }))
    .filter((x): x is { name: string; before: any; after: any } => isNonEmptyString(x.name));

  const relKey = (r: any) => `${r?.propertyName ?? ''}|${r?.type ?? ''}|${r?.targetTableName ?? r?.targetTable?.name ?? r?.targetTable ?? ''}`;
  const bKeys = new Set(beforeRels.map(relKey));
  const aKeys = new Set(afterRels.map(relKey));
  const removedRelations = Array.from(bKeys).filter((k): k is string => isNonEmptyString(k) && !aKeys.has(k));
  const addedRelations = Array.from(aKeys).filter((k): k is string => isNonEmptyString(k) && !bKeys.has(k));

  const normalizeGroup = (g: any) =>
    (Array.isArray(g) ? g : [])
      .map((x) => String(x ?? '').trim())
      .filter(isNonEmptyString)
      .sort();

  const groupKey = (g: any) => normalizeGroup(g).join('|');

  const beforeUniqueKeys = new Set(beforeUniques.map(groupKey).filter(isNonEmptyString));
  const afterUniqueKeys = new Set(afterUniques.map(groupKey).filter(isNonEmptyString));
  const removedUniques = Array.from(beforeUniqueKeys).filter((k): k is string => isNonEmptyString(k) && !afterUniqueKeys.has(k));
  const addedUniques = Array.from(afterUniqueKeys).filter((k): k is string => isNonEmptyString(k) && !beforeUniqueKeys.has(k));

  const beforeIndexKeys = new Set(beforeIndexes.map(groupKey).filter(isNonEmptyString));
  const afterIndexKeys = new Set(afterIndexes.map(groupKey).filter(isNonEmptyString));
  const removedIndexes = Array.from(beforeIndexKeys).filter((k): k is string => isNonEmptyString(k) && !afterIndexKeys.has(k));
  const addedIndexes = Array.from(afterIndexKeys).filter((k): k is string => isNonEmptyString(k) && !beforeIndexKeys.has(k));

  return {
    removedColumns,
    addedColumns,
    renamedColumns,
    changedColumns,
    removedRelations,
    addedRelations,
    removedUniques,
    addedUniques,
    removedIndexes,
    addedIndexes,
  };
});

const modalRemovedColumns = computed<string[]>(() => {
  const serverCols = schemaConfirmDetails.value?.removedColumns;
  if (Array.isArray(serverCols) && serverCols.length) return serverCols.map((x: any) => String(x ?? '')).filter(isNonEmptyString);
  return localDiff.value.removedColumns;
});

const modalAddedColumns = computed<string[]>(() => localDiff.value.addedColumns || []);
const modalRenamedColumns = computed<any[]>(() => localDiff.value.renamedColumns || []);
const modalChangedColumns = computed<any[]>(() => localDiff.value.changedColumns || []);
const modalAddedRelations = computed<string[]>(() => localDiff.value.addedRelations || []);
const modalAddedUniques = computed<string[]>(() => localDiff.value.addedUniques || []);
const modalRemovedUniques = computed<string[]>(() => localDiff.value.removedUniques || []);
const modalAddedIndexes = computed<string[]>(() => localDiff.value.addedIndexes || []);
const modalRemovedIndexes = computed<string[]>(() => localDiff.value.removedIndexes || []);

const modalRemovedRelationsCount = computed<number>(() => {
  const n = schemaConfirmDetails.value?.removedRelationsCount;
  if (typeof n === 'number') return n;
  return localDiff.value.removedRelations.length;
});

const canConfirmDelete = computed(() => {
  const expected = schemaConfirmExpectedTableName.value;
  if (!expected) return false;
  return schemaConfirmInput.value.trim() === expected;
});

async function onSchemaConfirmSubmit() {
  if (!schemaConfirmDetails.value) {
    schemaConfirmModalOpen.value = false;
    return;
  }
  if (schemaConfirmMode.value === 'delete' && !canConfirmDelete.value) {
    return;
  }

  schemaConfirmLoading.value = true;
  try {
    if (schemaConfirmMode.value === 'update') {
      // 1) Try without confirm headers (may return challenge)
      await executePatchTable({ id: getId(table.value), body: table.value });
      if (updateError.value?.data?.code === 'SCHEMA_CONFIRM_REQUIRED') {
        schemaConfirmDetails.value = updateError.value?.data?.details || {};
        const d = schemaConfirmDetails.value || {};
        if (d.requiredConfirmHash && d.confirmToken) {
          const headers: Record<string, string> = {
            "x-schema-confirm-hash": String(d.requiredConfirmHash),
            "x-schema-confirm-token": String(d.confirmToken),
          };
          // 2) Retry once with confirm headers (user already confirmed)
          await executePatchTable({ id: getId(table.value), body: table.value, headers });
        } else {
          return;
        }
      }
      if (!updateError.value) {
        schemaConfirmModalOpen.value = false;
        await afterPatchSuccess();
      }
      return;
    }

    // delete mode: require typing table name, then attempt delete; if challenge returned, retry once with headers
    const deletedTableName = String(route.params.table);
    await executeDeleteTable({ id: getId(table.value) });
    if (deleteError.value?.data?.code === 'SCHEMA_CONFIRM_REQUIRED') {
      schemaConfirmDetails.value = deleteError.value?.data?.details || {};
      const d = schemaConfirmDetails.value || {};
      if (d.requiredConfirmHash && d.confirmToken) {
        const headers: Record<string, string> = {
          "x-schema-confirm-hash": String(d.requiredConfirmHash),
          "x-schema-confirm-token": String(d.confirmToken),
        };
        await executeDeleteTable({ id: getId(table.value), headers });
      } else {
        return;
      }
    }
    if (!deleteError.value) {
      schemaConfirmModalOpen.value = false;
      await afterDeleteSuccess(deletedTableName);
    }
  } finally {
    schemaConfirmLoading.value = false;
  }
}

watch(
  () => table.value,
  (newValue) => {
    if (
      newValue &&
      Object.keys(newValue).length > 0 &&
      formChanges.originalData.value &&
      Object.keys(formChanges.originalData.value).length > 0
    ) {
      const hasChanged = formChanges.checkChanges(newValue);
      hasFormChanges.value = hasChanged;
    }
  },
  { deep: true }
);

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="relative">
    <CommonModal v-model="schemaConfirmModalOpen" :handle="false">
      <template #title>
        <div class="flex items-start gap-3">
          <div
            class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border"
            :class="isSchemaConfirmDestructive
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200'"
          >
            <Icon :name="schemaConfirmMode === 'delete' ? 'lucide:trash-2' : (isSchemaConfirmDestructive ? 'lucide:triangle-alert' : 'lucide:diff')" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <div class="text-base font-semibold leading-6">
              {{ schemaConfirmMode === 'delete' ? 'Confirm Delete Table' : 'Review Changes' }}
            </div>
            <div class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
              {{ schemaConfirmSubtitle }}
            </div>
          </div>
        </div>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20 px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm text-gray-700 dark:text-gray-200">
                  <span class="text-gray-500 dark:text-gray-400">Table</span>
                  <span class="mx-2">·</span>
                  <span class="font-bold font-mono">{{ schemaConfirmExpectedTableName }}</span>
                </div>
                <div v-if="schemaConfirmMode !== 'delete'" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Operation: update
                </div>
              </div>
              <div
                class="shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="isSchemaConfirmDestructive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200'"
              >
                {{ schemaConfirmBadgeText }}
              </div>
            </div>
          </div>

          <div v-if="schemaConfirmMode !== 'delete'" class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Change summary</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">Review before confirming</div>
            </div>

            <div v-if="schemaConfirmDetails?.warning" class="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <div class="flex items-start gap-3">
                <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-300" />
                <div class="text-sm text-amber-900 dark:text-amber-100">
                  <div class="font-medium">Warning</div>
                  <div class="mt-0.5 text-amber-800/90 dark:text-amber-100/90">{{ schemaConfirmDetails.warning }}</div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <div v-if="modalRenamedColumns.length" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Renamed columns</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ modalRenamedColumns.length }}</div>
                </div>
                <ul class="mt-2 space-y-1.5">
                  <li v-for="c in modalRenamedColumns" :key="c.from + '->' + c.to" class="flex items-center gap-2 text-sm">
                    <span class="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40 px-2 py-1 font-mono">{{ c.from }}</span>
                    <Icon name="lucide:arrow-right" class="h-4 w-4 text-gray-400" />
                    <span class="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40 px-2 py-1 font-mono">{{ c.to }}</span>
                  </li>
                </ul>
              </div>

              <div v-if="modalAddedColumns.length" class="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-emerald-900 dark:text-emerald-100">Added columns</div>
                  <div class="text-xs text-emerald-700/80 dark:text-emerald-200/80">{{ modalAddedColumns.length }}</div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span v-for="c in modalAddedColumns" :key="c" class="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-900 bg-white/70 dark:bg-black/20 px-2.5 py-1 text-xs font-mono text-emerald-900 dark:text-emerald-100">
                    {{ c }}
                  </span>
                </div>
              </div>

              <div v-if="modalRemovedColumns.length" class="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-rose-900 dark:text-rose-100">Removed columns</div>
                  <div class="text-xs text-rose-700/80 dark:text-rose-200/80">{{ modalRemovedColumns.length }}</div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span v-for="c in modalRemovedColumns" :key="c" class="inline-flex items-center rounded-full border border-rose-200 dark:border-rose-900 bg-white/70 dark:bg-black/20 px-2.5 py-1 text-xs font-mono text-rose-900 dark:text-rose-100">
                    {{ c }}
                  </span>
                </div>
              </div>

              <div v-if="modalChangedColumns.length" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Modified columns</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ modalChangedColumns.length }}</div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span v-for="c in modalChangedColumns" :key="c.name" class="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40 px-2.5 py-1 text-xs font-mono text-gray-900 dark:text-gray-100">
                    {{ c.name }}
                  </span>
                </div>
              </div>

              <div v-if="modalAddedUniques.length || modalRemovedUniques.length" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Unique constraints</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    <span v-if="modalAddedUniques.length">+{{ modalAddedUniques.length }}</span>
                    <span v-if="modalAddedUniques.length && modalRemovedUniques.length" class="mx-1">·</span>
                    <span v-if="modalRemovedUniques.length">-{{ modalRemovedUniques.length }}</span>
                  </div>
                </div>
                <div v-if="modalAddedUniques.length" class="mt-2">
                  <div class="text-xs font-medium text-emerald-900/80 dark:text-emerald-200/80 mb-1">Added</div>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="u in modalAddedUniques" :key="'u+' + u" class="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/20 px-2.5 py-1 text-xs font-mono text-emerald-900 dark:text-emerald-100">
                      {{ u }}
                    </span>
                  </div>
                </div>
                <div v-if="modalRemovedUniques.length" class="mt-3">
                  <div class="text-xs font-medium text-rose-900/80 dark:text-rose-200/80 mb-1">Removed</div>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="u in modalRemovedUniques" :key="'u-' + u" class="inline-flex items-center rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/20 px-2.5 py-1 text-xs font-mono text-rose-900 dark:text-rose-100">
                      {{ u }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="modalAddedIndexes.length || modalRemovedIndexes.length" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Indexes</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    <span v-if="modalAddedIndexes.length">+{{ modalAddedIndexes.length }}</span>
                    <span v-if="modalAddedIndexes.length && modalRemovedIndexes.length" class="mx-1">·</span>
                    <span v-if="modalRemovedIndexes.length">-{{ modalRemovedIndexes.length }}</span>
                  </div>
                </div>
                <div v-if="modalAddedIndexes.length" class="mt-2">
                  <div class="text-xs font-medium text-emerald-900/80 dark:text-emerald-200/80 mb-1">Added</div>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="i in modalAddedIndexes" :key="'i+' + i" class="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/20 px-2.5 py-1 text-xs font-mono text-emerald-900 dark:text-emerald-100">
                      {{ i }}
                    </span>
                  </div>
                </div>
                <div v-if="modalRemovedIndexes.length" class="mt-3">
                  <div class="text-xs font-medium text-rose-900/80 dark:text-rose-200/80 mb-1">Removed</div>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="i in modalRemovedIndexes" :key="'i-' + i" class="inline-flex items-center rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/20 px-2.5 py-1 text-xs font-mono text-rose-900 dark:text-rose-100">
                      {{ i }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="modalAddedRelations.length" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Added relations</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ modalAddedRelations.length }}</div>
                </div>
                <div class="mt-2 space-y-1.5">
                  <div v-for="r in modalAddedRelations" :key="r" class="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {{ r }}
                  </div>
                </div>
              </div>

              <div v-if="modalRemovedRelationsCount" class="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 px-4 py-3">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-medium text-rose-900 dark:text-rose-100">Removed relations</div>
                  <div class="text-xs text-rose-700/80 dark:text-rose-200/80">{{ modalRemovedRelationsCount }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="schemaConfirmDetails?.requiredConfirmHash" class="space-y-1">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Confirm hash</div>
              <UButton size="xs" variant="ghost" @click="copyConfirmHash">
                Copy
              </UButton>
            </div>
            <div class="text-xs font-mono break-all rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40 px-4 py-3">
              {{ schemaConfirmDetails.requiredConfirmHash }}
            </div>
          </div>

          <div v-if="schemaConfirmMode === 'delete'" class="space-y-2">
            <div class="text-sm">
              Type the table name to confirm:
              <span class="font-mono font-bold">{{ schemaConfirmExpectedTableName }}</span>
            </div>
            <UInput v-model="schemaConfirmInput" class="w-full" placeholder="Enter table name" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <UButton variant="ghost" class="justify-center" @click="schemaConfirmModalOpen = false">
            Cancel
          </UButton>
          <UButton
            :color="schemaConfirmMode === 'delete' ? 'error' : (isSchemaConfirmDestructive ? 'warning' : 'primary')"
            :loading="schemaConfirmLoading"
            :disabled="schemaConfirmMode === 'delete' ? !canConfirmDelete : false"
            class="justify-center"
            @click="onSchemaConfirmSubmit"
          >
            <span class="inline-flex items-center gap-2">
              <Icon :name="schemaConfirmMode === 'delete' ? 'lucide:trash-2' : (isSchemaConfirmDestructive ? 'lucide:triangle-alert' : 'lucide:check')" class="h-4 w-4" />
              {{ schemaConfirmMode === 'delete' ? 'Delete' : 'Confirm' }}
            </span>
          </UButton>
        </div>
      </template>
    </CommonModal>

    <Transition name="loading-fade" mode="out-in">
      <div v-if="!isMounted || loading" class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
        <CommonFormCard>
          <CommonLoadingState
            type="form"
            context="page"
            size="sm"
          />
        </CommonFormCard>
      </div>

      <UForm v-else-if="table" @submit.prevent="save" :state="table">
        <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
          <CommonFormCard>
            <TableForm v-model="table" @save="save">
              <div class="space-y-6">
                <TableConstraints
                  v-model="table"
                  :column-names="table.columns?.map((c:any) => c?.name)"
                />
                <TableColumns v-model="table.columns" />
                <TableRelations
                  v-model="table.relations"
                  :table-options="
                    Object.values(schemas).map((schema: any) => ({
                      label: schema?.name,
                      value: getId(schema),
                    }))
                  "
                />
              </div>
            </TableForm>
          </CommonFormCard>
        </div>
      </UForm>

      <CommonEmptyState
        v-else
        title="Table not found"
        description="The requested table could not be loaded"
        icon="lucide:database"
        size="sm"
      />
    </Transition>

    <Teleport to="body">
      <UModal
        v-model:open="showSchemaViewer"
        :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'min-w-2xl max-w-4xl'"
      >
        <template #header>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-primary flex items-center justify-center shadow-lg"
              >
                <UIcon name="lucide:database" class="text-sm text-white" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-foreground">
                  {{ table?.name }} Schema
                </h2>
                <p class="text-sm text-muted-foreground">
                  API Documentation & Structure
                </p>
              </div>
            </div>
            <UButton
              icon="lucide:x"
              @click="showSchemaViewer = false"
              variant="soft"
              color="error"
              size="lg"
            />
          </div>
        </template>
        <template #body>
          <CollectionSchemaViewer v-if="table?.name" :table-name="table.name" />
        </template>
      </UModal>
    </Teleport>
  </div>
</template>
