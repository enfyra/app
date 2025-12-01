<script setup lang="ts">
import { getFolderIconName, getFolderIconColor } from "~/utils/file-management/folder-icons";

const showDetailModal = useState("folder-detail-modal", () => false);
const selectedFolder = useState<any>("folder-selected", () => null);

function formatDate(dateString: string) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

const folderIconName = computed(() => {
  if (!selectedFolder.value) return "lucide:folder-open";
  return getFolderIconName(selectedFolder.value);
});

const folderIconColor = computed(() => {
  if (!selectedFolder.value) return "#7C3AED";
  const colorClass = getFolderIconColor(selectedFolder.value);
  // Extract color from class (e.g., "text-blue-500" -> "#3B82F6")
  if (colorClass.includes("blue")) return "#3B82F6";
  if (colorClass.includes("amber")) return "#F59E0B";
  return "#7C3AED";
});
</script>

<template>
  <CommonModal
    v-model="showDetailModal"
  >
    <template #title>
      Folder Details
    </template>
      <template #body>
        <div v-if="selectedFolder" class="space-y-8">
          <!-- Folder Identity Section -->
          <div class="flex items-start gap-6">
            <!-- Folder Icon -->
            <div
              class="relative flex items-center justify-center w-20 h-20 rounded-2xl"
              :style="{
                background: `linear-gradient(135deg, ${folderIconColor}20, ${folderIconColor}10)`,
              }"
            >
              <UIcon
                :name="folderIconName"
                class="w-10 h-10"
                :style="{
                  color: folderIconColor,
                  opacity: 0.9,
                }"
              />
            </div>

            <!-- Folder Name & Badge -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h2
                  class="text-3xl font-semibold text-white truncate"
                  style="letter-spacing: -0.02em"
                >
                  {{ selectedFolder.name }}
                </h2>
                <UBadge
                  v-if="selectedFolder.isSystem"
                  variant="outline"
                  class="flex items-center gap-1.5 px-2.5 py-1"
                  style="
                    background: rgba(124, 58, 237, 0.1);
                    border-color: rgba(124, 58, 237, 0.3);
                    color: #7C3AED;
                  "
                >
                  <UIcon name="lucide:shield" class="w-3.5 h-3.5" />
                  System
                </UBadge>
              </div>
              <p
                v-if="selectedFolder.itemCount !== undefined"
                class="text-sm text-gray-400"
              >
                {{ selectedFolder.itemCount }} {{ selectedFolder.itemCount === 1 ? 'item' : 'items' }}
              </p>
            </div>
          </div>

          <!-- Description Section -->
          <div class="p-5 rounded-xl bg-gray-900/50">
            <div class="flex items-start gap-3">
              <UIcon
                name="lucide:file-text"
                class="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500"
              />
              <div class="flex-1 min-w-0">
                <div
                  class="text-xs mb-1.5 text-gray-500 uppercase"
                  style="letter-spacing: 0.05em; font-weight: 500"
                >
                  Description
                </div>
                <p
                  class="text-sm leading-relaxed"
                  :class="selectedFolder.description ? 'text-gray-300' : 'text-gray-500 italic'"
                >
                  {{ selectedFolder.description || "No description provided" }}
                </p>
              </div>
            </div>
          </div>

          <!-- Timestamps Section -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Created -->
            <div class="p-5 rounded-xl bg-gray-900/50">
              <div class="flex items-start gap-3">
                <UIcon
                  name="lucide:calendar"
                  class="w-4 h-4 mt-0.5 flex-shrink-0"
                  style="color: #06B6D4"
                />
                <div class="flex-1 min-w-0">
                  <div
                    class="text-xs mb-1.5 text-gray-500 uppercase"
                    style="letter-spacing: 0.05em; font-weight: 500"
                  >
                    Created
                  </div>
                  <p class="text-sm text-gray-300">
                    {{ formatDate(selectedFolder.createdAt) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Modified -->
            <div class="p-5 rounded-xl bg-gray-900/50">
              <div class="flex items-start gap-3">
                <UIcon
                  name="lucide:clock"
                  class="w-4 h-4 mt-0.5 flex-shrink-0"
                  style="color: #D946EF"
                />
                <div class="flex-1 min-w-0">
                  <div
                    class="text-xs mb-1.5 text-gray-500 uppercase"
                    style="letter-spacing: 0.05em; font-weight: 500"
                  >
                    Modified
                  </div>
                  <p class="text-sm text-gray-300">
                    {{ formatDate(selectedFolder.updatedAt) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Properties Section -->
          <div class="p-5 rounded-xl bg-gray-900/50 space-y-4">
            <div
              class="text-xs text-gray-500 uppercase mb-4"
              style="letter-spacing: 0.05em; font-weight: 500"
            >
              Properties
            </div>

            <!-- ID -->
            <div class="flex items-start gap-3 py-2">
              <UIcon
                name="lucide:hash"
                class="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500"
              />
              <div class="flex-1 min-w-0">
                <div class="text-xs mb-1 text-gray-500">ID</div>
                <code class="text-xs px-2 py-1 rounded font-mono text-gray-400 bg-gray-950">
                  {{ selectedFolder.id }}
                </code>
              </div>
            </div>

            <!-- Parent Folder -->
            <div class="flex items-start gap-3 py-2">
              <UIcon
                name="lucide:folder-tree"
                class="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500"
              />
              <div class="flex-1 min-w-0">
                <div class="text-xs mb-1 text-gray-500">Parent Folder</div>
                <div class="text-sm text-gray-300 flex items-center gap-2">
                  <span v-if="selectedFolder.parent?.name">{{ selectedFolder.parent.name }}</span>
                  <span v-else class="text-gray-500 italic">Root</span>
                </div>
              </div>
            </div>

            <!-- Order -->
            <div class="flex items-start gap-3 py-2">
              <UIcon
                name="lucide:list-ordered"
                class="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500"
              />
              <div class="flex-1 min-w-0">
                <div class="text-xs mb-1 text-gray-500">Order</div>
                <div class="text-sm text-gray-300">
                  {{ selectedFolder.order ?? 0 }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CommonModal>
</template>
