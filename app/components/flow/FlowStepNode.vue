<template>
  <div
    class="flow-step-node relative cursor-pointer transition-all border-2 rounded-lg shadow-sm hover:shadow-md"
    :class="nodeClass"
    @click="handleClick"
    :style="{ width: '220px' }"
  >
    <Handle type="target" :position="Position.Top" :style="{ opacity: 0 }" />
    <Handle type="source" :position="Position.Bottom" :style="{ opacity: 0 }" />

    <span v-if="data.execStatus === 'completed'" class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 z-10">
      <UIcon name="i-lucide-check" class="w-2.5 h-2.5 text-white" />
    </span>
    <span v-else-if="data.execStatus === 'failed'" class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 z-10" :title="data.execError || 'Step failed'">
      <UIcon name="i-lucide-x" class="w-2.5 h-2.5 text-white" />
    </span>
    <span v-else-if="data.execStatus === 'running'" class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 z-10">
      <UIcon name="i-lucide-loader" class="w-2.5 h-2.5 text-white animate-spin" />
    </span>
    <span v-else-if="data.execStatus === 'skipped'" class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 z-10">
      <UIcon name="i-lucide-minus" class="w-2.5 h-2.5 text-white" />
    </span>

    <div class="p-3">
      <div class="flex items-center gap-2 mb-1.5">
        <div :class="iconWrapperClass">
          <UIcon :name="iconName" class="w-3.5 h-3.5" />
        </div>
        <div class="flex-1 min-w-0">
          <h5 class="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {{ data.label || 'Unnamed' }}
          </h5>
        </div>
        <UBadge v-if="data.stepType !== 'add'" :color="typeColor" variant="soft" size="xs" class="text-[9px] flex-shrink-0">
          {{ data.stepType }}
        </UBadge>
        <UBadge v-if="data.branch === 'true'" color="success" variant="soft" size="xs" class="text-[8px] flex-shrink-0">true</UBadge>
        <UBadge v-else-if="data.branch === 'false'" color="error" variant="soft" size="xs" class="text-[8px] flex-shrink-0">false</UBadge>
      </div>

      <p v-if="description" class="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">
        {{ description }}
      </p>

      <div class="flex items-center gap-1 mt-1.5 flex-wrap">
        <UBadge
          v-for="badge in badges"
          :key="badge.label"
          :color="badge.color"
          variant="soft"
          size="xs"
          class="text-[8px]"
        >
          {{ badge.label }}
        </UBadge>
        <div v-if="showReorder" class="flex gap-0.5 ml-auto">
          <button :disabled="disabled || data.isFirst" :aria-label="`Move ${data.label} up`" :class="(disabled || data.isFirst) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200'" class="w-5 h-5 flex items-center justify-center rounded text-gray-400 transition-colors" @click.stop="!disabled && !data.isFirst && onMoveUp?.()">
            <UIcon name="i-lucide-chevron-up" class="w-3 h-3" />
          </button>
          <button :disabled="disabled || data.isLast" :aria-label="`Move ${data.label} down`" :class="(disabled || data.isLast) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200'" class="w-5 h-5 flex items-center justify-center rounded text-gray-400 transition-colors" @click.stop="!disabled && !data.isLast && onMoveDown?.()">
            <UIcon name="i-lucide-chevron-down" class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import type { StepNodeData } from '~/types/flow';
import { STEP_TYPE_COLOR_MAP, STEP_TYPE_ICON_MAP, type BadgeColor } from '~/utils/flow.constants';

interface Props {
  data: StepNodeData;
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

const typeColor = computed((): BadgeColor => {
  return STEP_TYPE_COLOR_MAP[props.data.stepType] || 'neutral';
});

const iconName = computed(() => {
  return STEP_TYPE_ICON_MAP[props.data.stepType] || 'lucide:circle';
});

const nodeClass = computed(() => {
  if (props.data.stepType === 'trigger') return 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 hover:shadow-md hover:border-primary-400 transition-all';
  if (props.data.stepType === 'add') return 'border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:shadow-md transition-all';
  if (props.data.enabled === false) return 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/40 opacity-60';
  return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md active:shadow-inner transition-all';
});

const iconWrapperClass = computed(() => {
  if (props.data.stepType === 'trigger') {
    return 'w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-primary-400';
  }
  if (props.data.stepType === 'add') {
    return 'w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400';
  }
  return 'w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-primary-400';
});

const description = computed(() => {
  const config = props.data.config || {};
  const t = props.data.stepType;
  if (t === 'trigger') return props.data.triggerInfo || '';
  if (t === 'add') return 'Click to add a new step';
  if (t === 'script' || t === 'condition') return config.code?.substring(0, 60);
  if (t === 'query') return `Query ${config.table}`;
  if (t === 'create') return `Create in ${config.table}`;
  if (t === 'update') return `Update ${config.table}`;
  if (t === 'delete') return `Delete from ${config.table}`;
  if (t === 'http') return `${config.method || 'GET'} ${config.url?.substring(0, 40)}`;
  if (t === 'trigger_flow') return `Trigger: ${config.flowName || config.flowId}`;
  if (t === 'sleep') return `Wait ${config.ms || 1000}ms`;
  if (t === 'log') return config.message?.substring(0, 60);
  return '';
});

const badges = computed(() => {
  const b: { label: string; color: BadgeColor }[] = [];
  if (props.data.enabled === false) b.push({ label: 'Disabled', color: 'neutral' });
  if (props.data.onError === 'skip') b.push({ label: 'Skip on error', color: 'warning' });
  if (props.data.onError === 'retry') b.push({ label: `Retry ${props.data.retryAttempts || 0}x`, color: 'info' });
  if (props.data.timeout && props.data.timeout !== 5000) b.push({ label: `${props.data.timeout / 1000}s`, color: 'neutral' });
  return b;
});
</script>
