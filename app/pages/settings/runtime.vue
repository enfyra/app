<script setup lang="ts">
const { registerPageHeader } = usePageHeaderRegistry();
const { me } = useAuth();
const runtime = useRuntimeMetrics();

const hasPermission = computed(() => !!me.value?.isRootAdmin);
const tabScroller = ref<HTMLElement | null>(null);
const canScrollTabsLeft = ref(false);
const canScrollTabsRight = ref(false);

function updateTabScrollState() {
  const el = tabScroller.value;
  if (!el) return;
  canScrollTabsLeft.value = el.scrollLeft > 8;
  canScrollTabsRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 8;
}

onMounted(() => {
  nextTick(updateTabScrollState);
  window.addEventListener('resize', updateTabScrollState, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', updateTabScrollState);
});

watch(() => runtime.tabItems, () => nextTick(updateTabScrollState), { deep: true });

function tabLabel(label: string) {
  return label.replace(/\s\(\d+\)$/, '');
}

function tabIssueCount(label: string) {
  const match = label.match(/\((\d+)\)$/);
  return match ? Number(match[1]) : 0;
}

registerPageHeader({
  title: 'Runtime Monitor',
  description: 'Live server runtime metrics',
  variant: 'default',
  gradient: 'blue',
});
</script>

<template>
  <div v-if="hasPermission" class="w-full min-w-0 max-w-[1000px] space-y-6 overflow-hidden pb-10">
    <RuntimeSummaryCards :runtime="runtime" />

    <CommonEmptyState
      v-if="runtime.instances.length === 0"
      title="No runtime metrics"
      description="The admin websocket has not received a runtime sample yet."
      icon="lucide:activity"
      size="md"
    />

    <template v-else>
      <div class="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div
          v-if="canScrollTabsLeft"
          class="pointer-events-none absolute inset-y-0 left-4 z-10 flex w-8 items-center justify-start bg-gradient-to-r from-[var(--surface-muted)] to-transparent sm:left-0"
        >
          <UIcon name="lucide:chevron-left" class="h-4 w-4 text-[var(--text-quaternary)]" />
        </div>
        <div
          v-if="canScrollTabsRight"
          class="pointer-events-none absolute inset-y-0 right-4 z-10 flex w-8 items-center justify-end bg-gradient-to-l from-[var(--surface-muted)] to-transparent sm:right-0"
        >
          <UIcon name="lucide:chevron-right" class="h-4 w-4 text-[var(--text-quaternary)]" />
        </div>

        <div
          ref="tabScroller"
          class="runtime-tab-scroll overflow-x-auto overflow-y-hidden"
          @scroll.passive="updateTabScrollState"
        >
          <div class="flex min-w-max border-b border-[var(--border-default)]">
            <button
              v-for="item in runtime.tabItems"
              :key="item.value"
              type="button"
              class="relative flex h-12 items-center gap-2 px-4 text-sm font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              :class="runtime.activeTab === item.value ? 'text-[var(--text-primary)]' : ''"
              :aria-label="tabLabel(item.label)"
              @click="runtime.activeTab = item.value"
            >
              <UIcon :name="item.icon" class="h-5 w-5 shrink-0" />
              <span class="hidden sm:inline">{{ tabLabel(item.label) }}</span>
              <span
                v-if="tabIssueCount(item.label) > 0"
                class="rounded-md bg-warning-400/10 px-1.5 py-0.5 text-xs font-semibold text-warning-600 dark:text-warning-400"
              >
                {{ tabIssueCount(item.label) }}
              </span>
              <span
                v-if="runtime.activeTab === item.value"
                class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--text-primary)]"
              />
            </button>
          </div>
        </div>
      </div>

      <RuntimeOverviewTab v-if="runtime.activeTab === 'overview'" :runtime="runtime" />
      <RuntimeRequestsTab v-else-if="runtime.activeTab === 'requests'" :runtime="runtime" />
      <RuntimeCacheTab v-else-if="runtime.activeTab === 'cache'" :runtime="runtime" />
      <RuntimeRedisTab v-else-if="runtime.activeTab === 'redis'" :runtime="runtime" />
      <RuntimeDatabaseTab v-else-if="runtime.activeTab === 'database'" :runtime="runtime" />
      <RuntimeFlowsTab v-else-if="runtime.activeTab === 'flows'" :runtime="runtime" />
      <RuntimeWorkersTab v-else-if="runtime.activeTab === 'workers'" :runtime="runtime" />
      <RuntimeConnectionsTab v-else-if="runtime.activeTab === 'connections'" :runtime="runtime" />

      <RuntimeMetricGuide :guide="runtime.activeGuide" />
    </template>
  </div>

  <div v-else class="flex items-center justify-center py-12">
    <CommonEmptyState
      title="Access denied"
      description="You do not have permission to view runtime metrics."
      icon="lucide:lock"
      size="md"
    />
  </div>
</template>

<style scoped>
.runtime-tab-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.runtime-tab-scroll::-webkit-scrollbar {
  display: none;
}
</style>
