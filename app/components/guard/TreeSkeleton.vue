<template>
  <div class="space-y-4" aria-busy="true" aria-label="Loading guard tree">
    <div class="rounded-lg bg-[var(--surface-muted)] p-3">
      <div class="h-3 w-4/5 rounded skeleton-inline skeleton-pulse-slow" />
      <div class="mt-2 h-3 w-3/5 rounded skeleton-inline skeleton-pulse-slow" />
    </div>

    <div class="guard-tree-skeleton-root">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <span class="h-4 w-4 shrink-0 rounded skeleton-inline skeleton-pulse-slow" />
          <span class="h-8 w-8 shrink-0 rounded-[var(--radius-control)] skeleton-gradient skeleton-pulse-slow" />
          <span class="min-w-0 flex-1 space-y-2">
            <span class="block h-4 w-44 rounded skeleton-gradient skeleton-pulse-slow" />
            <span class="block h-3 w-64 max-w-full rounded skeleton-inline skeleton-pulse-slow" />
          </span>
        </div>
        <span class="hidden h-6 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
        <span class="hidden h-6 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow md:block" />
        <span class="hidden h-7 w-7 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow md:block" />
      </div>

      <div class="mt-4 space-y-2">
        <div class="h-3 w-12 rounded skeleton-inline skeleton-pulse-slow" />
        <div
          v-for="row in 2"
          :key="row"
          class="guard-tree-skeleton-rule"
        >
          <span class="h-3.5 w-3.5 shrink-0 rounded skeleton-inline skeleton-pulse-slow" />
          <span class="h-4 w-4 shrink-0 rounded skeleton-gradient skeleton-pulse-slow" />
          <span class="min-w-0 flex-1 space-y-1.5">
            <span class="block h-3 w-28 rounded skeleton-gradient skeleton-pulse-slow" />
            <span class="block h-3 w-56 max-w-full rounded skeleton-inline skeleton-pulse-slow" />
          </span>
          <span class="hidden h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow md:block" />
          <span class="h-7 w-7 shrink-0 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <div class="h-3 w-20 rounded skeleton-inline skeleton-pulse-slow" />
        <div class="guard-tree-skeleton-child">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="h-4 w-4 shrink-0 rounded skeleton-inline skeleton-pulse-slow" />
              <span class="h-8 w-8 shrink-0 rounded-[var(--radius-control)] skeleton-gradient skeleton-pulse-slow" />
              <span class="min-w-0 flex-1 space-y-2">
                <span class="block h-4 w-36 rounded skeleton-gradient skeleton-pulse-slow" />
                <span class="block h-3 w-48 max-w-full rounded skeleton-inline skeleton-pulse-slow" />
              </span>
            </div>
            <span class="hidden h-6 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
            <span class="h-7 w-7 shrink-0 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
          </div>
        </div>
      </div>

      <div class="mt-4 flex gap-2 border-t border-[var(--border-default)] pt-3">
        <span class="h-7 w-20 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow" />
        <span class="h-7 w-28 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.guard-tree-skeleton-root {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--card-bg);
  padding: 16px;
}

.guard-tree-skeleton-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  padding: 10px;
}

.guard-tree-skeleton-child {
  border: 1px solid transparent;
  border-radius: var(--radius-card);
  background: var(--surface-muted);
  padding: 12px;
}
</style>
