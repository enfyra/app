<script setup lang="ts">
interface Props {
  filename: string | null;
  lines: string[];
  loading?: boolean;
  error?: string | null;
  isSearchMode?: boolean;
  searchResultCount?: number;
  searchLoading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  isSearchMode: false,
  searchResultCount: 0,
  searchLoading: false,
  hasMore: false,
  loadingMore: false,
});

const emit = defineEmits<{
  close: [];
  search: [query: string];
  reload: [];
  download: [];
  copy: [];
  clearSearch: [];
  loadMore: [];
}>();

const searchQuery = defineModel<string>("searchQuery", { default: "" });

function handleClose() {
  emit("close");
}

function handleReload() {
  emit("reload");
}

function handleDownload() {
  emit("download");
}

function handleCopy() {
  emit("copy");
}

function handleClearSearch() {
  emit("clearSearch");
}

function handleLoadMore() {
  emit("loadMore");
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.filename) {
    handleClose();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="filename"
        class="fixed inset-0 z-50 bg-white dark:bg-gray-950"
      >
        <div class="h-full flex flex-col">
          <div class="flex flex-col gap-3 px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UButton
                  size="lg"
                  variant="soft"
                  icon="lucide:arrow-left"
                  color="neutral"
                  @click="handleClose"
                />
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <UIcon name="lucide:file-text" class="w-4 h-4 text-white" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-gray-900 dark:text-white truncate">{{ filename }}</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ isSearchMode ? `${searchResultCount} results` : `${lines.length} lines` }}
                  </p>
                </div>
              </div>
              <div class="hidden md:flex items-center gap-2">
                <UInput
                  v-model="searchQuery"
                  placeholder="Search by ID (log_ / req_)..."
                  size="md"
                  class="w-56"
                  icon="lucide:search"
                >
                  <template v-if="searchQuery" #trailing>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="lucide:x"
                      class="-mr-1"
                      @click="handleClearSearch"
                    />
                  </template>
                </UInput>
                <UButton
                  size="lg"
                  variant="soft"
                  color="neutral"
                  icon="lucide:copy"
                  :disabled="lines.length === 0"
                  @click="handleCopy"
                />
                <UButton
                  size="lg"
                  variant="soft"
                  color="neutral"
                  icon="lucide:download"
                  :disabled="!filename"
                  @click="handleDownload"
                />
                <UButton
                  size="lg"
                  variant="soft"
                  color="neutral"
                  icon="lucide:refresh-cw"
                  :loading="loading"
                  :disabled="!filename"
                  @click="handleReload"
                />
              </div>
            </div>
            <div class="flex md:hidden items-center gap-2">
              <UInput
                v-model="searchQuery"
                placeholder="Search by ID (log_ / req_)..."
                size="md"
                class="flex-1"
                icon="lucide:search"
              >
                <template v-if="searchQuery" #trailing>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="lucide:x"
                    class="-mr-1"
                    @click="handleClearSearch"
                  />
                </template>
              </UInput>
              <UButton
                size="lg"
                variant="soft"
                color="neutral"
                icon="lucide:copy"
                :disabled="lines.length === 0"
                @click="handleCopy"
              />
              <UButton
                size="lg"
                variant="soft"
                color="neutral"
                icon="lucide:download"
                :disabled="!filename"
                @click="handleDownload"
              />
              <UButton
                size="lg"
                variant="soft"
                color="neutral"
                icon="lucide:refresh-cw"
                :loading="loading"
                :disabled="!filename"
                @click="handleReload"
              />
            </div>
          </div>

          <div class="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
            <div v-if="loading || searchLoading" class="flex items-center justify-center h-full">
              <CommonLoadingState :label="isSearchMode ? 'Searching...' : 'Loading log content...'" />
            </div>

            <div v-else-if="error" class="flex items-center justify-center h-full">
              <div class="text-center space-y-3">
                <UIcon name="lucide:alert-triangle" class="w-12 h-12 text-rose-400 mx-auto" />
                <p class="text-rose-400 font-medium text-lg">{{ error }}</p>
                <p class="text-gray-500">Check permissions or try again</p>
                <UButton size="sm" variant="soft" color="neutral" @click="handleClose">
                  Go back
                </UButton>
              </div>
            </div>

            <div v-else-if="lines.length === 0" class="flex items-center justify-center h-full">
              <div class="text-center space-y-3">
                <UIcon name="lucide:file-x" class="w-12 h-12 text-gray-500 mx-auto" />
                <p class="text-gray-400 text-lg">
                  {{ isSearchMode ? 'No search results found' : 'No log content found' }}
                </p>
                <UButton v-if="isSearchMode" size="sm" variant="soft" color="neutral" @click="handleClearSearch">
                  Clear search
                </UButton>
                <UButton v-else size="sm" variant="soft" color="neutral" @click="handleClose">
                  Go back
                </UButton>
              </div>
            </div>

            <div v-else class="p-4">
              <div
                v-for="(line, index) in lines"
                :key="index"
                class="flex gap-3 px-2 py-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-800/50"
              >
                <span class="text-gray-400 dark:text-gray-600 select-none w-8 text-right shrink-0 font-mono text-xs">{{ index + 1 }}</span>
                <pre class="whitespace-pre-wrap break-all flex-1 font-mono text-xs text-gray-700 dark:text-gray-300">{{ line }}</pre>
              </div>
              <div v-if="hasMore && !isSearchMode" class="flex justify-center py-6">
                <UButton
                  size="lg"
                  variant="soft"
                  color="primary"
                  :loading="loadingMore"
                  icon="lucide:chevrons-down"
                  @click="handleLoadMore"
                >
                  {{ loadingMore ? 'Loading...' : 'Load More' }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>