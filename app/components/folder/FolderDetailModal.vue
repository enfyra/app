<script setup lang="ts">
import { getFolderIconName, getFolderIconColor } from "~/utils/file-management/folder-icons";

// Use useState to get global state from composable
const showDetailModal = useState("folder-detail-modal", () => false);
const selectedFolder = useState<any>("folder-selected", () => null);
// Format date
function formatDate(dateString: string) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <Teleport to="body">
    <UModal
      v-model:open="showDetailModal"
      title="Folder Details"
      :close="{
        icon: 'lucide:x',
        color: 'error',
        variant: 'soft',
        label: 'Close',
      }"
    >
      <template #body>
        <div v-if="selectedFolder" class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <UIcon
                :name="getFolderIconName(selectedFolder)"
                class="w-8 h-8"
                :class="getFolderIconColor(selectedFolder)"
              />
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">
                {{ selectedFolder.name }}
              </h4>
              <p
                v-if="selectedFolder.isSystem"
                class="text-sm text-amber-600 dark:text-amber-400"
              >
                System Folder
              </p>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ selectedFolder.description ?? "null" }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Created
              </label>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(selectedFolder.createdAt) }}
              </p>
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Modified
              </label>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(selectedFolder.updatedAt) }}
              </p>
            </div>
          </div>

          <!-- Properties -->
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >ID</span
              >
              <span class="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {{ selectedFolder.id }}
              </span>
            </div>

            <div class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Parent</span
              >
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedFolder.parent?.name ?? "null" }}
              </span>
            </div>

            <div class="flex justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Order</span
              >
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedFolder.order ?? "null" }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </Teleport>
</template>
