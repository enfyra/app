<script setup lang="ts">
const notify = useNotify();
const { registerPageHeader } = usePageHeaderRegistry();
const { checkPermissionCondition } = usePermissions();
const { me } = useAuth();
const { isTablet } = useScreen();
const route = useRoute();
const router = useRouter();

const hasPermission = computed(() => {
  if (me.value?.isRootAdmin) return true;
  return checkPermissionCondition({
    or: [{ route: "/logs", actions: ["read"] }],
  });
});

registerPageHeader({
  title: "Server Logs",
  description: "Monitor and inspect backend log files",
  variant: "stats-focus",
  gradient: "cyan",
});

const { data: logsData, pending: logsPending, execute: fetchLogs } = useApi<any>(() => "/logs", {
  method: "get",
  errorContext: "Fetch log files",
});

const { data: statsData, pending: statsPending, execute: fetchStats } = useApi<any>(() => "/logs/stats", {
  method: "get",
  errorContext: "Fetch log stats",
});

const selectedFile = ref<string | null>(null);
const logContent = ref<string>("");
const logLoading = ref(false);
const logError = ref<string | null>(null);
const logSearchQuery = ref("");
const fileSearchQuery = ref("");
const isSearchMode = ref(false);
const searchResults = ref<string[]>([]);
const searchLoading = ref(false);
const hasMore = ref(false);
const loadingMore = ref(false);

const page = ref(1);
const limit = ref(20);

const files = computed(() => {
  const raw = (logsData.value as any)?.files;
  if (!Array.isArray(raw)) return [];
  return raw;
});

const stats = computed(() => {
  if ((logsData.value as any)?.stats) {
    return (logsData.value as any).stats;
  }
  return (statsData.value as any) || null;
});

const isInitialLoading = computed(() => (logsPending.value && !logsData.value) || (statsPending.value && !statsData.value));

const filteredFiles = computed(() => {
  if (!fileSearchQuery.value) return files.value;
  const query = fileSearchQuery.value.toLowerCase();
  return files.value.filter((file: any) => {
    const name = (file.filename || file.name || "").toLowerCase();
    return name.includes(query);
  });
});

const displayLines = computed(() => {
  if (isSearchMode.value && searchResults.value.length > 0) {
    return searchResults.value;
  }
  if (!logContent.value) return [];
  return logContent.value.split("\n").filter((line: string) => line.trim());
});

async function loadLogs() {
  await Promise.all([fetchLogs(), fetchStats()]);
}

async function searchInLog(query: string) {
  if (!selectedFile.value || !query.trim()) {
    isSearchMode.value = false;
    searchResults.value = [];
    return;
  }

  searchLoading.value = true;
  isSearchMode.value = true;

  try {
    const { getAppUrl, normalizeUrl } = await import("~/utils/api/url");
    const apiUrl = getAppUrl();
    const apiPrefix = "/api";
    const basePath = `logs/${encodeURIComponent(selectedFile.value)}`;
    const fullUrl = `${normalizeUrl(apiUrl, apiPrefix)}/${basePath}`;

    const response = await $fetch<any>(fullUrl, {
      method: "GET",
      credentials: "include",
      query: { id: query.trim() },
    });

    let results: string[] = [];

    if (response && response.lines) {
      results = response.lines.map((line: any) => {
        if (typeof line === "string") {
          try {
            const obj = JSON.parse(line.trim());
            return JSON.stringify(obj, null, 2);
          } catch {
            return line;
          }
        }
        return JSON.stringify(line, null, 2);
      });
    } else if (response && response.data) {
      const data = Array.isArray(response.data) ? response.data : [response.data];
      results = data.map((item: any) => {
        if (typeof item === "string") return item;
        return JSON.stringify(item, null, 2);
      });
    } else if (response) {
      const data = Array.isArray(response) ? response : [response];
      results = data.map((item: any) => {
        if (typeof item === "string") return item;
        return JSON.stringify(item, null, 2);
      });
    }

    searchResults.value = results;

    if (results.length === 0) {
      notify.warning("No results", `No logs found for "${query}"`);
    }
  } catch (err: any) {
    notify.error("Search failed", err?.data?.message || err?.message || "Could not search logs");
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
}

async function loadLogContent(file?: string, append: boolean = false) {
  const filename = file || selectedFile.value;
  if (!filename) return;

  if (!append) {
    selectedFile.value = filename;
    logLoading.value = true;
    logError.value = null;
    logSearchQuery.value = "";
    isSearchMode.value = false;
    searchResults.value = [];
    page.value = 1;
  } else {
    loadingMore.value = true;
    page.value++;
  }

  if (route.query.file !== filename) {
    router.push({ query: { file: filename } });
  }

  try {
    const { getAppUrl, normalizeUrl } = await import("~/utils/api/url");
    const apiUrl = getAppUrl();
    const apiPrefix = "/api";
    const basePath = `logs/${encodeURIComponent(filename)}`;
    const fullUrl = `${normalizeUrl(apiUrl, apiPrefix)}/${basePath}`;

    const response = await $fetch<any>(fullUrl, {
      method: "GET",
      credentials: "include",
      query: {
        page: page.value,
        pageSize: limit.value,
      },
    });

    let lines: string[] = [];

    if (response && response.lines) {
      lines = response.lines.map((line: any) => {
        if (typeof line === "string") {
          try {
            const obj = JSON.parse(line.trim());
            return JSON.stringify(obj, null, 2);
          } catch {
            return line;
          }
        }
        return JSON.stringify(line, null, 2);
      });
    } else if (typeof response === "string") {
      try {
        const parsed = JSON.parse(response);
        if (parsed.lines) {
          lines = parsed.lines.map((line: any) => {
            if (typeof line === "string") {
              try {
                const obj = JSON.parse(line.trim());
                return JSON.stringify(obj, null, 2);
              } catch {
                return line;
              }
            }
            return JSON.stringify(line, null, 2);
          });
        } else {
          lines = [JSON.stringify(parsed, null, 2)];
        }
      } catch {
        lines = [response];
      }
    } else if (response) {
      lines = [JSON.stringify(response, null, 2)];
    }

    hasMore.value = response?.hasMore ?? false;

    if (append) {
      const existingLines = logContent.value.split("\n").filter((line: string) => line.trim());
      logContent.value = [...existingLines, ...lines].join("\n");
    } else {
      logContent.value = lines.join("\n");
    }
  } catch (err: any) {
    logError.value = err?.data?.message || err?.message || "Failed to load log content";
    notify.error("Failed to load log", logError.value || "Failed to load log content");
  } finally {
    logLoading.value = false;
    loadingMore.value = false;
  }
}

async function loadMoreLogs() {
  if (!hasMore.value || loadingMore.value) return;
  await loadLogContent(undefined, true);
}

function clearSearch() {
  logSearchQuery.value = "";
  isSearchMode.value = false;
  searchResults.value = [];
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const debouncedSearch = (query: string) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    if (query.trim()) {
      searchInLog(query);
    } else {
      isSearchMode.value = false;
      searchResults.value = [];
    }
  }, 500);
};

watch(logSearchQuery, (newQuery) => {
  if (selectedFile.value) {
    debouncedSearch(newQuery);
  }
});

function handleSelectFile(file: any) {
  const name = file?.filename || file?.name;
  if (!name) return;
  loadLogContent(name);
}

function getFileIcon(file: any) {
  const name = (file.filename || file.name || "").toLowerCase();
  if (name.includes("crash")) return "lucide:skull";
  if (name.includes("error")) return "lucide:alert-circle";
  if (name.includes("access")) return "lucide:globe";
  if (name.includes("debug")) return "lucide:bug";
  return "lucide:file-text";
}

function getFileIconColor(file: any) {
  const name = (file.filename || file.name || "").toLowerCase();
  if (name.includes("crash")) return "error";
  if (name.includes("error")) return "warning";
  if (name.includes("access")) return "success";
  if (name.includes("debug")) return "neutral";
  return "primary";
}

function formatFileSize(size: string | number | undefined): string {
  if (!size) return "N/A";
  if (typeof size === "string") return size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadLog(file?: any) {
  const filename = file?.filename || file?.name || selectedFile.value;
  if (!filename) return;

  try {
    const { getAppUrl, normalizeUrl } = await import("~/utils/api/url");
    const apiUrl = getAppUrl();
    const apiPrefix = "/api";
    const basePath = `logs/${encodeURIComponent(filename)}/tail`;
    const fullUrl = `${normalizeUrl(apiUrl, apiPrefix)}/${basePath}`;

    const response = await $fetch<any>(fullUrl, {
      method: "GET",
      credentials: "include",
      query: { lines: 10000 },
    });

    let content = "";
    if (response && response.lines) {
      content = response.lines.map((line: any) => {
        if (typeof line === "string") return line;
        return JSON.stringify(line);
      }).join("\n");
    } else if (typeof response === "string") {
      content = response;
    } else {
      content = JSON.stringify(response, null, 2);
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    notify.success("Download started");
  } catch (err: any) {
    notify.error("Download failed", err?.message || "Could not download file");
  }
}

async function copyToClipboard() {
  const content = displayLines.value.join("\n");
  if (!content) return;
  try {
    await navigator.clipboard.writeText(content);
    notify.success("Copied to clipboard");
  } catch {
    notify.error("Failed to copy");
  }
}

function closeLogViewer() {
  selectedFile.value = null;
  logContent.value = "";
  logSearchQuery.value = "";
  logError.value = null;
  isSearchMode.value = false;
  searchResults.value = [];
  hasMore.value = false;
  loadingMore.value = false;
  page.value = 1;
  router.push({ query: {} });
}

useHeaderActionRegistry([
  {
    id: "refresh-logs",
    label: "Refresh",
    icon: "lucide:refresh-cw",
    variant: "solid",
    color: "primary",
    loading: computed(() => isInitialLoading.value),
    onClick: loadLogs,
    permission: { and: [{ route: "/logs", actions: ["read"] }] },
  },
]);

watch(
  () => route.query.file,
  (newFile) => {
    if (newFile && typeof newFile === "string" && newFile !== selectedFile.value) {
      loadLogContent(newFile);
    } else if (!newFile) {
      selectedFile.value = null;
      logContent.value = "";
      logSearchQuery.value = "";
      logError.value = null;
      isSearchMode.value = false;
      searchResults.value = [];
    }
  },
  { immediate: false }
);

onMounted(async () => {
  if (!hasPermission.value) return;

  if (route.query.file && typeof route.query.file === "string") {
    await Promise.all([loadLogs(), loadLogContent(route.query.file)]);
  } else {
    await loadLogs();
  }
});
</script>

<template>
  <div v-if="hasPermission" class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="isInitialLoading && !selectedFile"
        title="Loading log files..."
        description="Fetching server logs"
        size="md"
        type="card"
        context="page"
      />

      <div v-else class="space-y-6">
        <div v-if="stats && !selectedFile" class="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div class="rounded-xl p-4 surface-card">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <UIcon name="lucide:files" class="w-5 h-5 text-white" />
              </div>
              <div>
                <p class="text-2xl font-bold text-[var(--text-primary)]">
                  {{ stats.fileCount ?? 0 }}
                </p>
                <p class="text-xs text-[var(--text-tertiary)]">Total Files</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl p-4 surface-card">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <UIcon name="lucide:hard-drive" class="w-5 h-5 text-white" />
              </div>
              <div>
                <p class="text-2xl font-bold text-[var(--text-primary)]">
                  {{ stats.totalSizeFormatted ?? "N/A" }}
                </p>
                <p class="text-xs text-[var(--text-tertiary)]">Total Size</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl p-4 surface-card">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <UIcon name="lucide:clock" class="w-5 h-5 text-white" />
              </div>
              <div>
                <p class="text-sm font-bold text-[var(--text-primary)]">Live</p>
                <p class="text-xs text-[var(--text-tertiary)]">Monitoring</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!selectedFile" class="space-y-4">
          <UInput
            v-model="fileSearchQuery"
            placeholder="Search log files..."
            size="sm"
            class="w-64"
            icon="lucide:search"
          />

          <CommonAnimatedGrid
            :grid-class="isTablet ? 'grid gap-4 grid-cols-2' : 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'"
          >
            <CommonSettingsCard
              v-for="file in filteredFiles"
              :key="file.filename || file.name"
              :title="file.filename || file.name"
              :description="file.modifiedAt || 'Unknown date'"
              :icon="getFileIcon(file)"
              :icon-color="getFileIconColor(file)"
              card-class="cursor-pointer"
              :stats="[
                { label: 'Size', value: formatFileSize(file.size) },
              ]"
              :header-actions="[
                {
                  component: 'UButton',
                  props: { icon: 'lucide:download', size: 'xs', variant: 'ghost', color: 'neutral' },
                  onClick: (e?: Event) => { e?.stopPropagation(); downloadLog(file); },
                },
              ]"
              @click="handleSelectFile(file)"
            />
          </CommonAnimatedGrid>

          <CommonEmptyState
            v-if="filteredFiles.length === 0 && files.length > 0"
            title="No matching files"
            :description="`No files match '${fileSearchQuery}'`"
            icon="lucide:search-x"
            size="sm"
          />
        </div>
      </div>
    </Transition>

    <LogDetailViewer
      v-model:search-query="logSearchQuery"
      :filename="selectedFile"
      :lines="displayLines"
      :loading="logLoading"
      :error="logError"
      :is-search-mode="isSearchMode"
      :search-result-count="searchResults.length"
      :search-loading="searchLoading"
      :has-more="hasMore"
      :loading-more="loadingMore"
      @close="closeLogViewer"
      @reload="loadLogContent()"
      @download="downloadLog()"
      @copy="copyToClipboard"
      @clear-search="clearSearch"
      @load-more="loadMoreLogs"
    />
  </div>

  <div v-else class="flex items-center justify-center py-12">
    <CommonEmptyState
      title="Access denied"
      description="You do not have permission to view server logs"
      icon="lucide:lock"
      size="md"
    />
  </div>
</template>
