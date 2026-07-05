<template>
  <div class="eapp-page-constrained-wide space-y-6">
    <section class="grid gap-4 xl:grid-cols-3">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="surface-card p-4"
      >
        <div class="flex items-start gap-3">
          <div class="eapp-icon-tile eapp-primary-soft">
            <UIcon :name="metric.icon" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium eapp-text-secondary">{{ metric.label }}</p>
            <div class="mt-2 flex items-end justify-between gap-3">
              <p class="text-2xl font-semibold tracking-normal eapp-text-primary">{{ metric.value }}</p>
              <UBadge :color="metric.color" variant="soft">{{ metric.badge }}</UBadge>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="resource-demo-shell">
      <div class="resource-demo-toolbar">
        <div class="min-w-0">
          <h2 class="text-base font-semibold eapp-text-primary">Routes as Resource List</h2>
          <p class="mt-1 text-sm eapp-text-tertiary">
            Same object type, fast scan, aligned status and actions.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UInput
            icon="lucide:search"
            placeholder="Search routes"
            size="sm"
            :model-value="''"
            class="hidden w-56 sm:block"
          />
          <UButton icon="lucide:filter" color="neutral" variant="outline" size="sm" />
          <UButton icon="lucide:plus" label="Create" color="primary" variant="solid" size="sm" />
        </div>
      </div>

      <div class="resource-demo-list">
        <button
          v-for="route in routes"
          :key="route.path"
          type="button"
          class="resource-demo-row"
          :class="{ 'resource-demo-row-active': route.active }"
        >
          <span class="resource-demo-leading" :class="route.active ? 'eapp-primary-solid' : 'eapp-primary-soft'">
            <UIcon :name="route.icon" class="size-4" />
          </span>

          <span class="min-w-0 flex-1 text-left">
            <span class="flex min-w-0 items-center gap-2">
              <span class="truncate text-sm font-semibold eapp-text-primary">{{ route.title }}</span>
              <UBadge
                v-for="method in route.methods"
                :key="method"
                size="xs"
                color="primary"
                variant="soft"
              >
                {{ method }}
              </UBadge>
            </span>
            <span class="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs eapp-text-tertiary">
              <span class="font-mono">{{ route.path }}</span>
              <span>{{ route.description }}</span>
            </span>
          </span>

          <span class="hidden items-center gap-2 md:flex">
            <UBadge :color="route.statusColor" variant="soft">{{ route.status }}</UBadge>
            <span class="resource-demo-count">{{ route.count }}</span>
          </span>

          <span class="resource-demo-actions">
            <UButton icon="lucide:play" color="neutral" variant="ghost" size="xs" />
            <UButton icon="lucide:more-horizontal" color="neutral" variant="ghost" size="xs" />
          </span>
        </button>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <div class="resource-demo-shell">
        <div class="resource-demo-toolbar">
          <div>
            <h2 class="text-base font-semibold eapp-text-primary">Columns as Dense Rows</h2>
            <p class="mt-1 text-sm eapp-text-tertiary">Compare type, visibility, and rules without card noise.</p>
          </div>
          <UButton icon="lucide:settings-2" color="neutral" variant="outline" size="sm" />
        </div>

        <div class="resource-demo-table">
          <div class="resource-demo-table-head">
            <span>Column</span>
            <span>Type</span>
            <span>State</span>
          </div>
          <div
            v-for="column in columns"
            :key="column.name"
            class="resource-demo-table-row"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium eapp-text-primary">{{ column.name }}</span>
              <span class="block truncate text-xs eapp-text-tertiary">{{ column.note }}</span>
            </span>
            <span class="font-mono text-xs eapp-text-secondary">{{ column.type }}</span>
            <span class="flex justify-end">
              <UBadge :color="column.color" variant="soft">{{ column.state }}</UBadge>
            </span>
          </div>
        </div>
      </div>

      <div class="cards-demo-region">
        <div class="cards-demo-header">
          <div>
            <h2 class="text-base font-semibold eapp-text-primary">When Cards Still Win</h2>
            <p class="mt-1 text-sm eapp-text-tertiary">Use cards for summaries, catalogs, and distinct entry points.</p>
          </div>
        </div>

        <div class="grid gap-3">
          <article
            v-for="card in cardExamples"
            :key="card.title"
            class="surface-card-hover p-4"
          >
            <div class="flex gap-3">
              <div class="eapp-icon-tile eapp-primary-soft">
                <UIcon :name="card.icon" class="size-5" />
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-semibold eapp-text-primary">{{ card.title }}</h3>
                <p class="mt-1 text-sm eapp-text-tertiary">{{ card.description }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Resource List Demo",
  description: "A theme-native list direction for Enfyra admin collections",
  leadingIcon: "lucide:list-tree",
  gradient: "none",
});

const metrics = [
  { label: "Healthy Routes", value: "42", badge: "+8 live", color: "success" as const, icon: "lucide:route" },
  { label: "Runtime Signals", value: "18", badge: "3 warnings", color: "warning" as const, icon: "lucide:activity" },
  { label: "Extension Entries", value: "7", badge: "themed", color: "primary" as const, icon: "lucide:puzzle" },
];

const routes = [
  {
    title: "User profile endpoint",
    path: "/api/users/:id",
    description: "Dynamic repository route with field permissions",
    methods: ["GET", "PATCH"],
    status: "Published",
    statusColor: "success" as const,
    count: "12.4k calls",
    icon: "lucide:user-round",
    active: true,
  },
  {
    title: "Flow execution trigger",
    path: "/api/flows/:id/run",
    description: "Runs sandboxed workflow steps with audit output",
    methods: ["POST"],
    status: "Guarded",
    statusColor: "warning" as const,
    count: "863 calls",
    icon: "lucide:workflow",
    active: false,
  },
  {
    title: "Public asset delivery",
    path: "/assets/:folder/:file",
    description: "Anonymous file access through storage bridge",
    methods: ["GET"],
    status: "Public",
    statusColor: "info" as const,
    count: "31.8k calls",
    icon: "lucide:file-image",
    active: false,
  },
  {
    title: "Extension runtime manifest",
    path: "/api/extensions/runtime",
    description: "Compiled runtime code and package metadata",
    methods: ["GET"],
    status: "Cached",
    statusColor: "primary" as const,
    count: "5.1k calls",
    icon: "lucide:blocks",
    active: false,
  },
];

const columns = [
  { name: "id", note: "Primary key", type: "uuid", state: "System", color: "neutral" as const },
  { name: "email", note: "Unique login identity", type: "varchar", state: "Required", color: "warning" as const },
  { name: "role_id", note: "Relation to enfyra_role", type: "relation", state: "Guarded", color: "primary" as const },
  { name: "last_login_at", note: "Displayed in account panel", type: "datetime", state: "Optional", color: "info" as const },
];

const cardExamples = [
  {
    title: "Package catalog entries",
    description: "Visual identity and install intent matter more than row comparison.",
    icon: "lucide:package-plus",
  },
  {
    title: "Runtime overview metrics",
    description: "Small summary cards help users spot health and priority at a glance.",
    icon: "lucide:gauge",
  },
  {
    title: "Feature launchers",
    description: "Top-level navigation choices benefit from larger touch targets.",
    icon: "lucide:sparkles",
  },
];
</script>

<style scoped>
.resource-demo-shell {
  overflow: hidden;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}

.resource-demo-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-default);
  background: var(--surface-header);
}

.resource-demo-list {
  display: grid;
}

.resource-demo-row {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border-default);
  background: transparent;
  transition: background-color 0.16s ease, box-shadow 0.16s ease;
}

.resource-demo-row:last-child {
  border-bottom: 0;
}

.resource-demo-row:hover {
  background: var(--surface-nested);
}

.resource-demo-row-active {
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brand-500) 10%, transparent), transparent 42%),
    var(--surface-default);
}

.resource-demo-row-active::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  content: "";
  background: var(--action-primary-bg);
}

.resource-demo-leading {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
}

.resource-demo-count {
  min-width: 5.5rem;
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.resource-demo-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.125rem;
}

.resource-demo-table {
  display: grid;
}

.resource-demo-table-head,
.resource-demo-table-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8rem 7rem;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
}

.resource-demo-table-head {
  background: var(--table-header-bg);
  border-bottom: 1px solid var(--table-header-border);
  color: var(--table-header-color);
  font-size: 0.75rem;
  font-weight: 600;
}

.resource-demo-table-head span:last-child {
  justify-self: end;
}

.resource-demo-table-row {
  border-bottom: 1px solid var(--table-cell-border);
}

.resource-demo-table-row:last-child {
  border-bottom: 0;
}

.resource-demo-table-row:hover {
  background: var(--surface-muted);
}

.cards-demo-region {
  display: grid;
  align-content: start;
  gap: 1rem;
}

.cards-demo-header {
  padding: 0 0.125rem;
}

@media (max-width: 767px) {
  .resource-demo-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .resource-demo-row {
    align-items: flex-start;
  }

  .resource-demo-actions {
    margin-left: auto;
  }

  .resource-demo-table-head {
    display: none;
  }

  .resource-demo-table-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }
}
</style>
