<template>
  <div
    v-if="data.stepType === 'add'"
    class="flow-add-node group"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <Handle type="target" :position="Position.Left" class="flow-handle" />
    <div class="flow-add-btn">
      <UIcon name="i-lucide-plus" class="w-4 h-4 transition-transform duration-[var(--duration-base)] group-hover:scale-110" />
    </div>
    <span class="flow-add-label">{{ data.label || 'Add step' }}</span>
  </div>

  <div
    v-else-if="data.stepType === 'trigger'"
    class="flow-trigger-node"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <Handle type="source" :position="Position.Right" class="flow-handle" />
    <div class="flex items-center gap-2.5 px-4 py-2.5">
      <div class="flow-trigger-icon">
        <UIcon name="i-lucide-zap" class="w-4 h-4" />
      </div>
      <div class="min-w-0">
        <div class="text-[13px] font-semibold text-[var(--text-primary)] leading-tight truncate">
          {{ data.label }}
        </div>
        <div v-if="data.triggerInfo" class="text-[11px] text-[var(--text-tertiary)] leading-tight truncate">
          {{ data.triggerInfo }}
        </div>
      </div>
    </div>
  </div>

  <div
    v-else
    class="flow-step-card group"
    :class="{
      'flow-step-disabled': data.enabled === false,
      'flow-step-selected': selected,
    }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <Handle type="target" :position="Position.Left" class="flow-handle" />
    <Handle type="source" :position="Position.Right" class="flow-handle" />

    <div v-if="data.execStatus" class="flow-exec-badge" :class="`flow-exec-${data.execStatus}`">
      <UIcon
        :name="execIcon"
        class="w-3 h-3"
        :class="{ 'animate-spin': data.execStatus === 'running' }"
      />
    </div>

    <div v-if="data.branch" class="flow-branch-tag" :class="data.branch === 'true' ? 'flow-branch-true' : 'flow-branch-false'">
      {{ data.branch }}
    </div>

    <div class="flex items-start gap-3 px-3.5 py-3">
      <div class="flow-step-icon" :class="`flow-icon-${data.stepType}`">
        <UIcon :name="iconName" class="w-4 h-4" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[13px] font-medium text-[var(--text-primary)] leading-tight truncate">
            {{ data.label || 'Unnamed' }}
          </span>
        </div>
        <div v-if="description" class="text-[11px] text-[var(--text-tertiary)] leading-snug mt-0.5 truncate">
          {{ description }}
        </div>

        <div v-if="badges.length > 0 || showReorder" class="flex items-center gap-1.5 mt-2">
          <span
            v-for="badge in badges"
            :key="badge.label"
            class="flow-meta-badge"
            :class="`flow-meta-${badge.color}`"
          >
            {{ badge.label }}
          </span>
          <div v-if="showReorder" class="flow-reorder-actions flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              :disabled="disabled || data.isFirst"
              :aria-label="`Move ${data.label} left`"
              class="flow-reorder-btn"
              :class="{ 'opacity-30 cursor-not-allowed': disabled || data.isFirst }"
              @click.stop="!disabled && !data.isFirst && onMoveUp?.()"
            >
              <UIcon name="i-lucide-chevron-left" class="w-3 h-3" />
            </button>
            <button
              :disabled="disabled || data.isLast"
              :aria-label="`Move ${data.label} right`"
              class="flow-reorder-btn"
              :class="{ 'opacity-30 cursor-not-allowed': disabled || data.isLast }"
              @click.stop="!disabled && !data.isLast && onMoveDown?.()"
            >
              <UIcon name="i-lucide-chevron-right" class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import type { StepNodeData } from '~/types/flow';
import { STEP_TYPE_ICON_MAP } from '~/utils/flow.constants';

interface Props {
  data: StepNodeData;
  selected?: boolean;
  onClick?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disabled?: boolean;
}

const props = defineProps<Props>();

function handleClick() {
  props.onClick?.();
}

const showReorder = computed(() => !['trigger', 'add'].includes(props.data.stepType));

const iconName = computed(() => {
  return STEP_TYPE_ICON_MAP[props.data.stepType] || 'lucide:circle';
});

const execIcon = computed(() => {
  switch (props.data.execStatus) {
    case 'completed': return 'i-lucide-check';
    case 'failed': return 'i-lucide-x';
    case 'running': return 'i-lucide-loader-2';
    case 'skipped': return 'i-lucide-minus';
    default: return 'i-lucide-circle';
  }
});

const description = computed(() => {
  const config = props.data.config || {};
  const t = props.data.stepType;
  if (t === 'trigger') return props.data.triggerInfo || '';
  if (t === 'add') return '';
  if (t === 'script' || t === 'condition') return '';
  if (t === 'query') return `Query ${config.table || ''}`;
  if (t === 'delete') return `Delete from ${config.table || ''}`;
  if (t === 'http') return `${config.method || 'GET'} ${(config.url || '').substring(0, 40)}`;
  if (t === 'trigger_flow') return `Trigger: ${config.flowName || config.flowId || ''}`;
  if (t === 'sleep') return `Wait ${config.ms || 1000}ms`;
  if (t === 'log') return (config.message || '').substring(0, 60);
  return '';
});

const badges = computed(() => {
  const b: { label: string; color: string }[] = [];
  if (props.data.enabled === false) b.push({ label: 'Disabled', color: 'neutral' });
  if (props.data.onError === 'skip') b.push({ label: 'Skip on error', color: 'warning' });
  if (props.data.onError === 'retry') b.push({ label: `Retry ${props.data.retryAttempts || 0}x`, color: 'info' });
  if (props.data.timeout && props.data.timeout !== 5000) b.push({ label: `${props.data.timeout / 1000}s`, color: 'neutral' });
  return b;
});
</script>

<style scoped>
.flow-handle {
  opacity: 0;
  width: 8px;
  height: 8px;
}

.flow-add-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px;
}

.flow-add-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-subcontrol);
  border: 1.5px dashed var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  background: var(--surface-default);
  transition:
    border-color var(--duration-base) var(--ease-standard),
    color var(--duration-base) var(--ease-standard),
    background-color var(--duration-base) var(--ease-standard),
    box-shadow var(--duration-base) var(--ease-standard);
}

.flow-add-node:hover .flow-add-btn {
  border-color: var(--md-primary);
  color: var(--md-primary);
  background: color-mix(in srgb, var(--md-primary) 6%, var(--surface-default));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--md-primary) 12%, transparent);
}

.flow-add-node:focus-visible {
  outline: none;
}

.flow-add-node:focus-visible .flow-add-btn {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 3px var(--theme-focus-ring);
}

.flow-add-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-quaternary);
  white-space: nowrap;
  transition: color var(--duration-base) var(--ease-standard);
}

.flow-add-node:hover .flow-add-label {
  color: var(--md-primary);
}

.flow-trigger-node {
  border-radius: var(--radius-control);
  border: 1.5px solid color-mix(in srgb, var(--md-primary) 40%, var(--border-default));
  background: color-mix(in srgb, var(--md-primary) 8%, var(--surface-default));
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--ease-standard),
    box-shadow var(--duration-base) var(--ease-standard);
}

.flow-trigger-node:hover,
.flow-trigger-node:focus-visible {
  border-color: var(--md-primary);
  box-shadow: var(--shadow-sm);
  outline: none;
}

.flow-trigger-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-subcontrol);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  background: var(--md-primary);
}

.flow-step-card {
  position: relative;
  width: 240px;
  border-radius: var(--radius-control);
  border: 1.5px solid var(--border-default);
  background: var(--surface-default);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--ease-standard),
    box-shadow var(--duration-base) var(--ease-standard);
}

.flow-step-card:hover,
.flow-step-card:focus-visible {
  border-color: color-mix(in srgb, var(--md-primary) 50%, var(--border-default));
  box-shadow: var(--shadow-sm);
  outline: none;
}

.flow-step-selected {
  border-color: var(--md-primary) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--md-primary) 15%, transparent) !important;
}

.flow-step-disabled {
  opacity: 0.55;
  border-style: dashed;
}

.flow-exec-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: white;
  box-shadow: 0 0 0 2px var(--surface-default);
}

.flow-exec-completed { background: var(--st-success); }
.flow-exec-failed { background: var(--md-error); }
.flow-exec-running { background: var(--st-info); }
.flow-exec-skipped { background: var(--text-quaternary); }

.flow-branch-tag {
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: var(--radius-subcontrol);
  z-index: 5;
}

.flow-branch-true {
  color: var(--st-success);
  background: color-mix(in srgb, var(--st-success) 12%, var(--surface-default));
}

.flow-branch-false {
  color: var(--md-error);
  background: color-mix(in srgb, var(--md-error) 12%, var(--surface-default));
}

.flow-step-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-subcontrol);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.flow-icon-script {
  color: var(--md-primary);
  background: color-mix(in srgb, var(--md-primary) 10%, var(--surface-default));
}

.flow-icon-condition {
  color: var(--st-warning);
  background: color-mix(in srgb, var(--st-warning) 10%, var(--surface-default));
}

.flow-icon-query {
  color: var(--st-info);
  background: color-mix(in srgb, var(--st-info) 10%, var(--surface-default));
}

.flow-icon-delete {
  color: var(--md-error);
  background: color-mix(in srgb, var(--md-error) 10%, var(--surface-default));
}

.flow-icon-http {
  color: var(--md-secondary);
  background: color-mix(in srgb, var(--md-secondary) 10%, var(--surface-default));
}

.flow-icon-trigger_flow {
  color: var(--st-info);
  background: color-mix(in srgb, var(--st-info) 10%, var(--surface-default));
}

.flow-icon-sleep,
.flow-icon-log {
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--text-primary) 5%, var(--surface-default));
}

.flow-meta-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: var(--radius-subcontrol);
  letter-spacing: 0.01em;
}

.flow-meta-neutral {
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--text-primary) 5%, var(--surface-default));
}

.flow-meta-warning {
  color: var(--st-warning);
  background: color-mix(in srgb, var(--st-warning) 10%, var(--surface-default));
}

.flow-meta-info {
  color: var(--st-info);
  background: color-mix(in srgb, var(--st-info) 10%, var(--surface-default));
}

.flow-reorder-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-subcontrol);
  color: var(--text-quaternary);
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.flow-reorder-btn:hover:not(:disabled) {
  background: var(--surface-muted);
  color: var(--text-secondary);
}

.flow-step-card:focus-within .flow-reorder-actions {
  opacity: 1;
}
</style>
