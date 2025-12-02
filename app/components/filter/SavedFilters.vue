<script setup lang="ts">
interface Props {
  tableName: string;
  currentFilter: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  applyFilter: [filter: any];
  clearFilters: [];
}>();

const {
  getFilterHistory,
  removeFromHistory,
  updateFilterName,
  incrementUseCount,
  clearHistory,
} = useFilterHistory(props.tableName);

const savedFilters = ref<FilterHistoryItem[]>([]);
const showRenameDialog = ref(false);
const newFilterName = ref("");
const renamingFilter = ref<FilterHistoryItem | null>(null);
const searchQuery = ref("");
const clearAllConfirmation = ref(false);
const clearAllTimer = ref<NodeJS.Timeout | null>(null);
const deleteConfirmations = ref<Record<string, boolean>>({});
const deleteTimers = ref<Record<string, NodeJS.Timeout>>({});

// Load saved filters
const loadSavedFilters = () => {
  savedFilters.value = getFilterHistory();
};

const filteredSavedFilters = computed(() => {
  if (!searchQuery.value.trim()) {
    return savedFilters.value;
  }

  const query = searchQuery.value.toLowerCase();
  return savedFilters.value.filter((filter) =>
    filter.name.toLowerCase().includes(query)
  );
});

const popularFilters = computed(() => {
  // Use savedFilters to ensure reactivity when filters are deleted
  return savedFilters.value.sort((a, b) => b.useCount - a.useCount).slice(0, 3);
});

// Methods

const applySavedFilter = (filter: FilterHistoryItem) => {
  // Update use count immediately when clicking on saved filter
  incrementUseCount(filter.id);

  // Reload to update popular filters
  loadSavedFilters();

  emit("applyFilter", filter.filter);
};

const removeSavedFilter = (filterId: string) => {
  if (!deleteConfirmations.value[filterId]) {
    // First click - show confirmation state
    deleteConfirmations.value[filterId] = true;

    // Reset after 3 seconds if not confirmed
    deleteTimers.value[filterId] = setTimeout(() => {
      deleteConfirmations.value[filterId] = false;
      delete deleteTimers.value[filterId];
    }, 3000);
  } else {
    // Second click - perform delete
    if (deleteTimers.value[filterId]) {
      clearTimeout(deleteTimers.value[filterId]);
      delete deleteTimers.value[filterId];
    }
    deleteConfirmations.value[filterId] = false;
    removeFromHistory(filterId);
    loadSavedFilters();
  }
};

const startRenaming = (filter: FilterHistoryItem) => {
  renamingFilter.value = filter;
  newFilterName.value = filter.name;
  showRenameDialog.value = true;
};

const saveRename = () => {
  if (renamingFilter.value && newFilterName.value.trim()) {
    updateFilterName(renamingFilter.value.id, newFilterName.value.trim());
    showRenameDialog.value = false;
    renamingFilter.value = null;
    newFilterName.value = "";
    loadSavedFilters();
  }
};

const clearAllFilters = () => {
  if (!clearAllConfirmation.value) {
    // First click - show confirmation state
    clearAllConfirmation.value = true;

    // Reset after 3 seconds if not confirmed
    clearAllTimer.value = setTimeout(() => {
      clearAllConfirmation.value = false;
    }, 3000);
  } else {
    // Second click - perform action
    if (clearAllTimer.value) {
      clearTimeout(clearAllTimer.value);
    }
    clearAllConfirmation.value = false;
    clearHistory();
    loadSavedFilters();
  }
};

import { formatDate as formatDateUtil } from "~/utils/common/filter/filter-helpers";

const formatDate = (dateString: string) => {
  return formatDateUtil(dateString, true); // includeTime = true
};

// Lifecycle
onMounted(() => {
  loadSavedFilters();
});

onUnmounted(() => {
  if (clearAllTimer.value) {
    clearTimeout(clearAllTimer.value);
  }
  // Clean up all delete timers
  Object.values(deleteTimers.value).forEach((timer) => {
    clearTimeout(timer);
  });
});

// Watch for external filter changes
watch(
  () => props.tableName,
  () => {
    loadSavedFilters();
  }
);
</script>

<template>
  <div class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-800 dark:text-white/90">Saved Filters</h3>
      <UButton
        v-if="savedFilters.length > 0"
        @click="clearAllFilters"
        size="md"
        :variant="clearAllConfirmation ? 'solid' : 'soft'"
        :color="clearAllConfirmation ? 'error' : 'error'"
        :icon="
          clearAllConfirmation ? 'lucide:alert-triangle' : 'lucide:trash-2'
        "
      >
        {{ clearAllConfirmation ? "Confirm Clear All?" : "Clear All" }}
      </UButton>
    </div>

    <!-- Search -->
    <div v-if="savedFilters.length > 3" class="mb-3">
      <UInput
        v-model="searchQuery"
        placeholder="Search saved filters..."
        icon="lucide:search"
        size="sm"
        class="w-full"
      />
    </div>

    <!-- Popular Filters (if no search) -->
    <div v-if="!searchQuery && popularFilters.length > 0" class="mb-4">
      <div
        class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"
      >
        <UIcon name="lucide:trending-up" class="w-3 h-3" />
        Most Used
      </div>
      <div class="space-y-1">
        <div
          v-for="filter in popularFilters"
          :key="`popular-${filter.id}`"
          class="flex items-center justify-between p-3 rounded-lg border border-warning-400/20 bg-warning-400/5 lg:hover:border-warning-400/30 cursor-pointer transition-all duration-200 group"
          @click="applySavedFilter(filter)"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
              {{ filter.name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ filter.useCount }} uses
            </div>
          </div>
          <UIcon name="lucide:star" class="w-3 h-3 text-warning-500" />
        </div>
      </div>
    </div>

    <!-- Saved Filters List -->
    <div v-if="filteredSavedFilters.length > 0" class="space-y-1">
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {{ searchQuery ? "Search Results" : "All Saved Filters" }}
      </div>

      <div class="max-h-80 overflow-y-auto space-y-1 custom-scrollbar">
        <div
          v-for="filter in filteredSavedFilters"
          :key="filter.id"
          class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 lg:hover:border-gray-300 dark:lg:hover:border-gray-700 lg:hover:bg-gray-50 dark:lg:hover:bg-white/5 cursor-pointer transition-all duration-200 group"
          @click="applySavedFilter(filter)"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
              {{ filter.name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ formatDate(filter.lastUsed) }} • {{ filter.useCount }} uses
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              @click.stop="startRenaming(filter)"
              icon="lucide:edit-2"
              size="lg"
              variant="soft"
              color="primary"
              class="px-3 py-2"
            />
            <UButton
              @click.stop="removeSavedFilter(filter.id)"
              :icon="
                deleteConfirmations[filter.id]
                  ? 'lucide:alert-triangle'
                  : 'lucide:trash-2'
              "
              size="lg"
              :variant="deleteConfirmations[filter.id] ? 'solid' : 'soft'"
              color="error"
              class="px-3 py-2"
            >
              {{ deleteConfirmations[filter.id] ? "Sure?" : "" }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="savedFilters.length === 0" class="text-center py-8">
      <UIcon
        name="lucide:bookmark"
        class="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2"
      />
      <div class="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
        No saved filters yet
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
        Apply filters and click "Save" to bookmark your favorite filter
        combinations
      </div>
    </div>

    <!-- No Search Results -->
    <div
      v-else-if="searchQuery && filteredSavedFilters.length === 0"
      class="text-center py-8"
    >
      <UIcon
        name="lucide:search-x"
        class="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2"
      />
      <div class="text-sm text-gray-500 dark:text-gray-400 text-center">
        No filters found for "{{ searchQuery }}"
      </div>
    </div>

    <!-- Rename Filter Dialog -->
    <UModal v-model:open="showRenameDialog">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <span class="text-base font-semibold">Rename Filter</span>
          <UButton
            @click="showRenameDialog = false"
            icon="lucide:x"
            size="md"
            variant="soft"
            color="error"
          >
            Close
          </UButton>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-800 dark:text-white/90 mb-2">
              Filter Name
            </label>
            <UInput
              v-model="newFilterName"
              placeholder="Enter new name..."
              class="w-full"
              @keyup.enter="saveRename"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="w-full">
          <UButton
            @click="saveRename"
            variant="solid"
            color="primary"
            size="lg"
            class="w-full text-center justify-center"
            :disabled="!newFilterName.trim()"
          >
            Rename
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
