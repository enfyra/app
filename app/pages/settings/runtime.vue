<script setup lang="ts">
import type { Component } from 'vue';
import RuntimeOverviewTab from '~/components/runtime/RuntimeOverviewTab.vue';
import RuntimeRequestsTab from '~/components/runtime/RuntimeRequestsTab.vue';
import RuntimeCacheTab from '~/components/runtime/RuntimeCacheTab.vue';
import RuntimeRedisTab from '~/components/runtime/RuntimeRedisTab.vue';
import RuntimeDatabaseTab from '~/components/runtime/RuntimeDatabaseTab.vue';
import RuntimeFlowsTab from '~/components/runtime/RuntimeFlowsTab.vue';
import RuntimeWorkersTab from '~/components/runtime/RuntimeWorkersTab.vue';
import RuntimeConnectionsTab from '~/components/runtime/RuntimeConnectionsTab.vue';
import RuntimeGuardsTab from '~/components/runtime/RuntimeGuardsTab.vue';

const { me } = useAuth();
const runtime = useRuntimeMetrics();

const hasPermission = computed(() => !!me.value?.isRootAdmin);

function tabLabel(label: string) {
  return label.replace(/\s\(\d+\)$/, '');
}

function tabIssueCount(label: string) {
  const match = label.match(/\((\d+)\)$/);
  return match ? Number(match[1]) : 0;
}

const runtimeSections = computed(() =>
  runtime.tabItems.map((item) => {
    const count = tabIssueCount(item.label);
    return {
      ...item,
      label: tabLabel(item.label),
      title: 'Runtime Monitor',
      description: 'Live server runtime metrics',
      ...(count > 0 ? { badge: String(count) } : {}),
    };
  }),
);

const tabComponents: Record<string, Component> = {
  overview: RuntimeOverviewTab,
  requests: RuntimeRequestsTab,
  cache: RuntimeCacheTab,
  redis: RuntimeRedisTab,
  database: RuntimeDatabaseTab,
  flows: RuntimeFlowsTab,
  workers: RuntimeWorkersTab,
  connections: RuntimeConnectionsTab,
  guards: RuntimeGuardsTab,
};
</script>

<template>
  <div v-if="hasPermission" class="w-full min-w-0 eapp-page-constrained space-y-6 overflow-hidden pb-10">
    <RuntimeSummaryCards :runtime="runtime" />

    <UAlert
      v-if="runtime.metricsError"
      color="warning"
      variant="soft"
      title="Runtime metrics unavailable"
      :description="runtime.metricsError"
    />

    <CommonEmptyState
      v-if="runtime.instances.length === 0"
      title="No runtime metrics"
      description="Waiting for a runtime snapshot from the admin websocket."
      icon="lucide:activity"
      size="md"
    />

    <template v-else>
      <CommonPanel v-model="runtime.activeTab" :sections="runtimeSections">
        <template v-for="section in runtimeSections" :key="section.value" #[section.value]>
          <component :is="tabComponents[section.value]" v-if="tabComponents[section.value]" :runtime="runtime" />
        </template>
      </CommonPanel>

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
