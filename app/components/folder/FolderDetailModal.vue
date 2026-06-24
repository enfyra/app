<script setup lang="ts">
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
  if (!selectedFolder.value) return "var(--brand-violet-deep)";
  const colorClass = getFolderIconColor(selectedFolder.value);

  if (colorClass.includes("blue")) return "#3B82F6";
  if (colorClass.includes("amber")) return "#F59E0B";
  return "var(--brand-violet-deep)";
});
</script>

<template>
  <CommonModal
    v-model:open="showDetailModal"
  >
    <template #header>
      Folder Details
    </template>
      <template #body>
        <div v-if="selectedFolder" class="space-y-8">
          
          <div class="flex items-start gap-6">
            
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
                    color: var(--brand-violet-deep);
                  "
                >
                  <UIcon name="lucide:shield" class="w-3.5 h-3.5" />
                  System
                </UBadge>
              </div>
              <p
                v-if="selectedFolder.itemCount !== undefined"
                class="text-sm text-[var(--text-quaternary)]"
              >
                {{ selectedFolder.itemCount }} {{ selectedFolder.itemCount === 1 ? 'item' : 'items' }}
              </p>
            </div>
          </div>

          <div class="p-5 rounded-xl bg-[var(--surface-muted)]">
            <div class="flex items-start gap-3">
              <UIcon
                name="lucide:file-text"
                class="w-4 h-4 mt-0.5 flex-shrink-0 eapp-text-tertiary"
              />
              <div class="flex-1 min-w-0">
                <div
                  class="text-xs mb-1.5 eapp-text-tertiary uppercase"
                  style="letter-spacing: 0.05em; font-weight: 500"
                >
                  Description
                </div>
                <p
                  class="text-sm leading-relaxed"
                  :class="selectedFolder.description ? 'eapp-text-secondary' : 'eapp-text-tertiary italic'"
                >
                  {{ selectedFolder.description || "No description provided" }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            
            <div class="p-5 rounded-xl bg-[var(--surface-muted)]">
              <div class="flex items-start gap-3">
                <UIcon
                  name="lucide:calendar"
                  class="w-4 h-4 mt-0.5 flex-shrink-0"
                  style="color: var(--accent-cyan)"
                />
                <div class="flex-1 min-w-0">
                  <div
                    class="text-xs mb-1.5 eapp-text-tertiary uppercase"
                    style="letter-spacing: 0.05em; font-weight: 500"
                  >
                    Created
                  </div>
                  <p class="text-sm eapp-text-secondary">
                    {{ formatDate(selectedFolder.createdAt) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="p-5 rounded-xl bg-[var(--surface-muted)]">
              <div class="flex items-start gap-3">
                <UIcon
                  name="lucide:clock"
                  class="w-4 h-4 mt-0.5 flex-shrink-0"
                  style="color: var(--accent-fuchsia)"
                />
                <div class="flex-1 min-w-0">
                  <div
                    class="text-xs mb-1.5 eapp-text-tertiary uppercase"
                    style="letter-spacing: 0.05em; font-weight: 500"
                  >
                    Modified
                  </div>
                  <p class="text-sm eapp-text-secondary">
                    {{ formatDate(selectedFolder.updatedAt) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="p-5 rounded-xl bg-[var(--surface-muted)] space-y-4">
            <div
              class="text-xs eapp-text-tertiary uppercase mb-4"
              style="letter-spacing: 0.05em; font-weight: 500"
            >
              Properties
            </div>

            <div class="flex items-start gap-3 py-2">
              <UIcon
                name="lucide:hash"
                class="w-4 h-4 mt-0.5 flex-shrink-0 eapp-text-tertiary"
              />
              <div class="flex-1 min-w-0">
                <div class="text-xs mb-1 eapp-text-tertiary">ID</div>
                <code class="text-xs px-2 py-1 rounded font-mono text-[var(--text-quaternary)] bg-[var(--surface-muted)]">
                  {{ selectedFolder.id }}
                </code>
              </div>
            </div>

            <div class="flex items-start gap-3 py-2">
              <UIcon
                name="lucide:folder-tree"
                class="w-4 h-4 mt-0.5 flex-shrink-0 eapp-text-tertiary"
              />
              <div class="flex-1 min-w-0">
                <div class="text-xs mb-1 eapp-text-tertiary">Parent Folder</div>
                <div class="text-sm eapp-text-secondary flex items-center gap-2">
                  <span v-if="selectedFolder.parent?.name">{{ selectedFolder.parent.name }}</span>
                  <span v-else class="eapp-text-tertiary italic">Root</span>
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3 py-2">
              <UIcon
                name="lucide:list-ordered"
                class="w-4 h-4 mt-0.5 flex-shrink-0 eapp-text-tertiary"
              />
              <div class="flex-1 min-w-0">
                <div class="text-xs mb-1 eapp-text-tertiary">Order</div>
                <div class="text-sm eapp-text-secondary">
                  {{ selectedFolder.order ?? 0 }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CommonModal>
</template>
