<script setup lang="ts">
import FileManagerToolbar from './FileManagerToolbar.vue';
import FileManagerActions from './FileManagerActions.vue';
import type { PanelSection } from '~/types/ui';
interface Props {
  parentId?: string;
  title?: string;
  description?: string;
  folders?: any[];
  files?: any[];
  foldersLoading?: boolean;
  filesLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  showCreateButton?: boolean;
}

interface Emits {
  refreshItems: [];
  refreshFolders: [];
  refreshFiles: [];
  createFolder: [];
  createFile: [];
  contextChange: [active: boolean];
}

const props = withDefaults(defineProps<Props>(), {
  foldersLoading: false,
  filesLoading: false,
  folders: () => [],
  files: () => [],
  emptyTitle: "No items yet",
  emptyDescription:
    "This folder is empty. Create folders or upload files to get started.",
  showCreateButton: true,
  parentId: undefined,
  title: 'Library',
  description: undefined,
});

const emit = defineEmits<Emits>();

const { viewMode, setViewMode } = useFileManagerViewMode();
const { isSelectionMode, selectedItems, toggleItemSelection, clearSelection, deselectAllItems, toggleSelectionMode } =
  useFileManagerSelection();
const {
  isMoveMode,
  isAnyMovePending,
  moveState,
  startMoveMode,
  cancelMoveMode,
  isMoveHereDisabled,
  handleMoveHere,
  clearFileManagerState,
} = useFileManagerMove();
const { deleteSelectedItems } = useFileManager();
const { getId } = useDatabase();

function handleFolderClick(folder: any) {
  if (isBusy.value) return;
  if (isSelectionMode.value && !isMoveMode.value) {
    handleToggleItemSelection(String(getId(folder)));
    return;
  }
  if (
    moveState.value.moveMode &&
    (moveState.value.selectedFolderIds || []).includes(String(getId(folder)))
  ) {
    const notify = useNotify();
    notify.warning("Cannot navigate", "You cannot move a folder into itself.");
    return;
  }
  navigateTo(`/storage/management/folder/${getId(folder)}`);
}

function handleFileClick(file: any) {
  if (isBusy.value) return;
  if (isSelectionMode.value && !isMoveMode.value) {
    handleToggleItemSelection(String(getId(file)));
    return;
  }
  if (moveState.value.moveMode) {
    const notify = useNotify();
    notify.info("Cannot open file", "Cancel move mode to access files.");
    return;
  }

  navigateTo(`/storage/management/file/${getId(file)}`);
}

function handleToggleItemSelection(itemId: string) {
  if (isBusy.value || isMoveMode.value || !canSelect.value) return;
  toggleItemSelection(String(itemId));

  if (
    selectedItems.value.length > 0 &&
    !isSelectionMode.value &&
    !isMoveMode.value
  ) {
    isSelectionMode.value = true;
  }
}

onMounted(() => {
  if (moveState.value.moveMode && moveState.value.selectedItems.length > 0) {
    selectedItems.value = [...moveState.value.selectedItems];
    isSelectionMode.value = false;
  }
});

function clearAllState() {
  clearFileManagerState();
  clearSelection();
}

function handleStartMoveMode() {
  if (isBusy.value || !canMove.value || selectedItems.value.length === 0) return;
  startMoveMode(
    selectedItems.value,
    props.folders,
    props.files,
    props.parentId
  );
  isSelectionMode.value = false;
}

function handleCancelMoveMode() {
  if (isBusy.value) return;
  const clearedSelection = cancelMoveMode();
  selectedItems.value = clearedSelection;
}

async function handleMoveHereWrapper() {
  const success = await handleMoveHere(props.parentId, () =>
    emit("refreshItems")
  );
  if (success) {
    clearSelection();
    cancelMoveMode();
  }
}

onBeforeRouteLeave((to, from) => {
  if (
    from.path.includes("/storage/management") &&
    !to.path.includes("/storage/management")
  ) {
    clearAllState();
  }
});

async function handleBulkDelete() {
  const selected = new Set(selectedItems.value);
  const folderList = props.folders.filter(folder => selected.has(String(getId(folder))));
  const fileIds = props.files.filter(file => selected.has(String(getId(file)))).map(file => String(getId(file)));
  const result = await deleteSelectedItems(folderList, fileIds);
  if (result.cancelled) return;
  const deleted = new Set([...result.deletedFolderIds, ...result.deletedFileIds]);
  selectedItems.value = selectedItems.value.filter(id => !deleted.has(String(id)));
  if (!result.failed && selectedItems.value.length === 0) clearSelection();
  emit('refreshItems');
}

const { register: registerHeaderActions } = useHeaderActionRegistry();
const { hasPermission } = usePermissions();
const operationPending = ref<'delete' | 'move' | null>(null);
const library = useTemplateRef<HTMLElement>('library');
const contextActive = computed(() => isSelectionMode.value || selectedItems.value.length > 0 || isMoveMode.value);
const isBusy = computed(() => operationPending.value !== null || isAnyMovePending.value);
const loadedIds = computed(() => [...props.folders, ...props.files].map(item => String(getId(item))));
const visibleFolders = computed(() => props.folders.map(folder => ({ ...folder, id: String(getId(folder)) })));
const visibleFiles = computed(() => props.files.map(file => ({ ...file, id: String(getId(file)) })));
const canSelect = computed(() => hasPermission('/enfyra_file', 'DELETE') || hasPermission('/enfyra_folder', 'DELETE') || hasPermission('/enfyra_file', 'PATCH') || hasPermission('/enfyra_folder', 'PATCH'));
const canUpload = computed(() => props.showCreateButton && hasPermission('/enfyra_file', 'POST'));
const canCreateFolder = computed(() => props.showCreateButton && hasPermission('/enfyra_folder', 'POST'));
const canMove = computed(() => canManageSelection('PATCH'));
const canDelete = computed(() => canManageSelection('DELETE'));
const moveCount = computed(() => moveState.value.selectedItems.length);
const canMoveHere = computed(() =>
  (!moveState.value.selectedFileIds.length || hasPermission('/enfyra_file', 'PATCH')) &&
  (!moveState.value.selectedFolderIds.length || hasPermission('/enfyra_folder', 'PATCH')),
);

const panelSections = computed<PanelSection[]>(() => [{
  value: 'library',
  title: props.title,
  description: props.description,
  actions: [{
    id: 'library-tools',
    component: markRaw(FileManagerToolbar),
    props: {
      viewMode: viewMode.value,
      folderCount: props.folders.length,
      fileCount: props.files.length,
      moveMode: isMoveMode.value,
      selectionMode: isSelectionMode.value,
      busy: isBusy.value,
      loading: props.foldersLoading || props.filesLoading,
      canCreateFolder: canCreateFolder.value,
      canSelect: canSelect.value,
      'onUpdate:viewMode': setViewMode,
      onCreateFolder: () => emit('createFolder'),
      onRefresh: () => emit('refreshItems'),
      onSelect: startSelection,
    },
  }],
}]);

watch(contextActive, active => emit('contextChange', active), { immediate: true });

registerHeaderActions([{
  id: 'upload-file',
  label: 'Upload',
  icon: 'lucide:upload',
  variant: 'solid',
  color: 'primary',
  order: 10,
  show: computed(() => canUpload.value && !isBusy.value && !isMoveMode.value),
  onClick: () => emit('createFile'),
}]);

function clearSelectedItems() {
  if (!isBusy.value) deselectAllItems();
}

function exitSelectionMode() {
  if (!isBusy.value) clearSelection();
}

function canManageSelection(method: string) {
  if (selectedItems.value.length === 0) return hasPermission('/enfyra_file', method) || hasPermission('/enfyra_folder', method);
  return selectedItems.value.every(id => {
    if (props.folders.some(folder => String(getId(folder)) === String(id))) return hasPermission('/enfyra_folder', method);
    if (props.files.some(file => String(getId(file)) === String(id))) return hasPermission('/enfyra_file', method);
    return false;
  });
}

function startSelection() {
  if (!isBusy.value && !isMoveMode.value && canSelect.value) toggleSelectionMode();
}

function toggleAllLoaded() {
  if (isBusy.value || isMoveMode.value) return;
  selectedItems.value = loadedIds.value.every(id => selectedItems.value.includes(id)) ? [] : [...loadedIds.value];
}

async function deleteSelection() {
  if (isBusy.value || !canDelete.value) return;
  operationPending.value = 'delete';
  try {
    await handleBulkDelete();
  } finally {
    operationPending.value = null;
  }
}

async function moveSelectionHere() {
  if (isBusy.value || !canMoveHere.value) return;
  operationPending.value = 'move';
  try {
    await handleMoveHereWrapper();
  } finally {
    operationPending.value = null;
  }
}

watch([loadedIds, isBusy], ([ids]) => {
  if (isMoveMode.value || isBusy.value) return;
  const loaded = new Set(ids);
  selectedItems.value = selectedItems.value.filter(id => loaded.has(String(id)));
});
</script>

<template>
  <div ref="library" class="min-w-0">
  <CommonPanel :sections="panelSections" body-class="!p-0">
    <template #library>
    <FileManagerActions
      :anchor="library"
      :active="contextActive"
      :selected-count="selectedItems.length"
      :total-count="loadedIds.length"
      :move-mode="isMoveMode"
      :move-count="moveCount"
      :busy="isBusy"
      :deleting="operationPending === 'delete'"
      :moving="operationPending === 'move' || isAnyMovePending"
      :loading="props.foldersLoading || props.filesLoading"
      :can-move="canMove"
      :can-delete="canDelete"
      :move-here-disabled="!canMoveHere || isMoveHereDisabled(props.parentId)"
      @clear="clearSelectedItems"
      @exit-selection="exitSelectionMode"
      @toggle-all="toggleAllLoaded"
      @move="handleStartMoveMode"
      @delete="deleteSelection"
      @move-here="moveSelectionHere"
      @cancel-move="handleCancelMoveMode"
    />

    <div class="p-3 md:p-4" :class="contextActive ? 'pb-36 sm:pb-24 md:pb-24' : undefined">
      <section v-if="props.foldersLoading || props.folders.length > 0">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon name="lucide:folder" class="h-5 w-5 text-muted" />
            <h3 class="text-base font-semibold text-[var(--text-primary)]">
              Folders
            </h3>
          </div>
          <span class="text-sm text-[var(--text-tertiary)]">
            {{ props.folders.length }}
          </span>
        </div>

        <FolderView
          :folders="visibleFolders"
          :view-mode="viewMode"
          :loading="props.foldersLoading && props.folders.length === 0"
          empty-title="No folders"
          empty-description="No folders in this location"
          :is-selection-mode="isSelectionMode"
          :selected-items="selectedItems"
          @folder-click="handleFolderClick"
          @toggle-selection="handleToggleItemSelection"
          @refresh-folders="() => emit('refreshFolders')"
        />
      </section>

      <section
        v-if="props.filesLoading || props.files.length > 0"
        class="mt-6 border-t border-default pt-6 md:mt-8 md:pt-8"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon name="lucide:file" class="h-5 w-5 text-muted" />
            <h3 class="text-base font-semibold text-[var(--text-primary)]">
              Files
            </h3>
          </div>
          <span class="text-sm text-[var(--text-tertiary)]">
            {{ props.files.length }}
          </span>
        </div>

        <FileView
          :files="visibleFiles"
          :view-mode="viewMode"
          :loading="props.filesLoading && props.files.length === 0"
          empty-title="No files"
          empty-description="No files in this location"
          :is-selection-mode="isSelectionMode"
          :selected-items="selectedItems"
          @file-click="handleFileClick"
          @toggle-selection="handleToggleItemSelection"
          @refresh-files="() => emit('refreshFiles')"
        />
      </section>

      <div
        v-if="
          !props.foldersLoading &&
          !props.filesLoading &&
          props.folders.length === 0 &&
          props.files.length === 0
        "
        class="py-8"
      >
        <CommonEmptyState
          :title="emptyTitle"
          :description="emptyDescription"
          icon="lucide:folder-open"
          variant="naked"
          size="lg"
        />
      </div>
    </div>
    </template>
    <template #footer>
      <p class="text-xs text-muted">{{ props.folders.length }} folders · {{ props.files.length }} files</p>
    </template>
  </CommonPanel>
  </div>
</template>
