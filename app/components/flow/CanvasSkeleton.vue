<template>
  <div
    class="flow-canvas-skeleton border border-[var(--border-default)] rounded-lg overflow-hidden bg-[var(--surface-muted)]"
    aria-busy="true"
    aria-label="Loading flow canvas"
  >
    <div class="flow-canvas-skeleton-grid" />
    <div class="flow-canvas-skeleton-controls">
      <span class="h-8 w-8 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
      <span class="h-8 w-8 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
      <span class="h-8 w-8 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
    </div>
    <div class="flow-canvas-skeleton-stack">
      <div class="flow-canvas-skeleton-node flow-canvas-skeleton-node-trigger">
        <span class="h-6 w-6 rounded-[var(--radius-subcontrol)] skeleton-gradient skeleton-pulse-slow" />
        <span class="min-w-0 flex-1 space-y-1.5">
          <span class="block h-3 w-28 rounded skeleton-gradient skeleton-pulse-slow" />
          <span class="block h-2.5 w-36 rounded skeleton-inline skeleton-pulse-slow" />
        </span>
        <span class="h-5 w-14 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
      </div>

      <span class="flow-canvas-skeleton-edge" />

      <div class="flow-canvas-skeleton-node">
        <span class="h-6 w-6 rounded-[var(--radius-subcontrol)] skeleton-gradient skeleton-pulse-slow" />
        <span class="min-w-0 flex-1 space-y-1.5">
          <span class="block h-3 w-32 rounded skeleton-gradient skeleton-pulse-slow" />
          <span class="block h-2.5 w-24 rounded skeleton-inline skeleton-pulse-slow" />
        </span>
        <span class="h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
      </div>

      <div class="flow-canvas-skeleton-branch">
        <span class="flow-canvas-skeleton-branch-line" />
        <div class="flow-canvas-skeleton-node flow-canvas-skeleton-node-branch">
          <span class="h-6 w-6 rounded-[var(--radius-subcontrol)] skeleton-gradient skeleton-pulse-slow" />
          <span class="min-w-0 flex-1 space-y-1.5">
            <span class="block h-3 w-24 rounded skeleton-gradient skeleton-pulse-slow" />
            <span class="block h-2.5 w-20 rounded skeleton-inline skeleton-pulse-slow" />
          </span>
          <span class="h-5 w-10 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
        </div>
        <div class="flow-canvas-skeleton-node flow-canvas-skeleton-node-branch">
          <span class="h-6 w-6 rounded-[var(--radius-subcontrol)] skeleton-gradient skeleton-pulse-slow" />
          <span class="min-w-0 flex-1 space-y-1.5">
            <span class="block h-3 w-24 rounded skeleton-gradient skeleton-pulse-slow" />
            <span class="block h-2.5 w-20 rounded skeleton-inline skeleton-pulse-slow" />
          </span>
          <span class="h-5 w-10 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
        </div>
      </div>

      <span class="flow-canvas-skeleton-edge flow-canvas-skeleton-edge-short" />

      <div class="flow-canvas-skeleton-node flow-canvas-skeleton-node-add">
        <span class="h-6 w-6 rounded-[var(--radius-subcontrol)] skeleton-inline skeleton-pulse-slow" />
        <span class="min-w-0 flex-1 space-y-1.5">
          <span class="block h-3 w-24 rounded skeleton-inline skeleton-pulse-slow" />
          <span class="block h-2.5 w-32 rounded skeleton-inline skeleton-pulse-slow" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-canvas-skeleton {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 350px;
}

.flow-canvas-skeleton-grid {
  position: absolute;
  inset: 0;
  opacity: 0.42;
  background-image:
    radial-gradient(color-mix(in srgb, var(--border-default) 70%, transparent) 1px, transparent 1px);
  background-size: 20px 20px;
}

.flow-canvas-skeleton-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  display: grid;
  gap: 6px;
}

.flow-canvas-skeleton-stack {
  position: relative;
  display: flex;
  min-height: inherit;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
}

.flow-canvas-skeleton-node {
  display: flex;
  width: min(220px, 100%);
  align-items: center;
  gap: 8px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-control);
  background: var(--card-bg);
  padding: 12px;
  box-shadow: var(--card-shadow);
}

.flow-canvas-skeleton-node-trigger {
  border-color: color-mix(in srgb, var(--brand-500) 36%, var(--border-default));
}

.flow-canvas-skeleton-node-add {
  border-style: dashed;
  background: var(--surface-nested);
}

.flow-canvas-skeleton-edge {
  display: block;
  width: 2px;
  height: 34px;
  background: color-mix(in srgb, var(--border-default) 80%, var(--surface-muted));
}

.flow-canvas-skeleton-edge-short {
  height: 22px;
}

.flow-canvas-skeleton-branch {
  position: relative;
  display: flex;
  width: min(600px, 100%);
  justify-content: center;
  gap: clamp(24px, 8vw, 96px);
  padding-top: 34px;
}

.flow-canvas-skeleton-branch-line {
  position: absolute;
  top: 0;
  left: 50%;
  width: min(340px, 60%);
  height: 34px;
  border-top: 2px solid color-mix(in srgb, var(--border-default) 75%, var(--surface-muted));
  border-left: 2px solid color-mix(in srgb, var(--border-default) 75%, var(--surface-muted));
  border-right: 2px solid color-mix(in srgb, var(--border-default) 75%, var(--surface-muted));
  transform: translateX(-50%);
}

.flow-canvas-skeleton-node-branch {
  width: min(220px, 44%);
}

@media (max-width: 640px) {
  .flow-canvas-skeleton-stack {
    padding: 18px;
  }

  .flow-canvas-skeleton-branch {
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding-top: 20px;
  }

  .flow-canvas-skeleton-branch-line {
    display: none;
  }

  .flow-canvas-skeleton-node-branch {
    width: min(220px, 100%);
  }
}
</style>
