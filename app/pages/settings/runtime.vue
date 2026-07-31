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

function scrollTabs(direction: 'left' | 'right') {
  const el = tabScroller.value;
  if (!el) return;
  const amount = direction === 'left' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8;
  el.scrollBy({ left: amount, behavior: 'smooth' });
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

const runtimeTabItems = computed(() =>
  runtime.tabItems.map((item) => {
    const count = tabIssueCount(item.label);
    return {
      ...item,
      label: tabLabel(item.label),
      badge: count > 0 ? String(count) : undefined,
    };
  }),
);

const tabComponentNames: Record<string, string> = {
  overview: 'RuntimeOverviewTab',
  requests: 'RuntimeRequestsTab',
  cache: 'RuntimeCacheTab',
  redis: 'RuntimeRedisTab',
  database: 'RuntimeDatabaseTab',
  flows: 'RuntimeFlowsTab',
  workers: 'RuntimeWorkersTab',
  connections: 'RuntimeConnectionsTab',
};

const activeTabComponent = computed(() => tabComponentNames[runtime.activeTab] ?? null);

registerPageHeader({
  title: 'Runtime Monitor',
  description: 'Live server runtime metrics',
  variant: 'default',
  gradient: 'purple',
});
</script>

<template>
  <div v-if="hasPermission" class="w-full min-w-0 eapp-page-constrained space-y-6 overflow-hidden pb-10">
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
        <button
          v-if="canScrollTabsLeft"
          type="button"
          aria-label="Scroll tabs left"
          class="absolute inset-y-0 left-4 z-10 flex w-8 min-w-[44px] items-center justify-start bg-gradient-to-r from-[var(--surface-muted)] to-transparent sm:left-0"
          @click="scrollTabs('left')"
        >
          <UIcon name="lucide:chevron-left" class="h-4 w-4 text-[var(--text-quaternary)]" />
        </button>
        <button
          v-if="canScrollTabsRight"
          type="button"
          aria-label="Scroll tabs right"
          class="absolute inset-y-0 right-4 z-10 flex w-8 min-w-[44px] items-center justify-end bg-gradient-to-l from-[var(--surface-muted)] to-transparent sm:right-0"
          @click="scrollTabs('right')"
        >
          <UIcon name="lucide:chevron-right" class="h-4 w-4 text-[var(--text-quaternary)]" />
        </button>

        <div
          ref="tabScroller"
          class="runtime-tab-scroll overflow-x-auto overflow-y-hidden"
          @scroll.passive="updateTabScrollState"
        >
          <UTabs
            v-model="runtime.activeTab"
            :items="runtimeTabItems"
            :content="false"
            variant="link"
          />
        </div>
      </div>

      <KeepAlive>
        <component :is="activeTabComponent" v-if="activeTabComponent" :key="runtime.activeTab" :runtime="runtime" />
      </KeepAlive>

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
