import type { StepType, StepErrorHandling } from '~/types/flow';

export type BadgeColor = 'error' | 'info' | 'success' | 'primary' | 'warning' | 'neutral' | 'secondary';

export const STEP_TYPE_OPTIONS: { label: string; value: StepType }[] = [
  { label: 'Script', value: 'script' },
  { label: 'Condition', value: 'condition' },
  { label: 'Query', value: 'query' },
  { label: 'Delete Record', value: 'delete' },
  { label: 'HTTP Request', value: 'http' },
  { label: 'Trigger Flow', value: 'trigger_flow' },
  { label: 'Sleep', value: 'sleep' },
  { label: 'Log', value: 'log' },
];

export const ERROR_OPTIONS: { label: string; value: StepErrorHandling }[] = [
  { label: 'Stop entire flow', value: 'stop' },
  { label: 'Skip this step and continue', value: 'skip' },
  { label: 'Retry this step', value: 'retry' },
];

export const STEP_TYPE_COLOR_MAP: Record<string, BadgeColor> = {
  script: 'primary',
  condition: 'warning',
  query: 'info',
  delete: 'error',
  http: 'secondary',
  trigger_flow: 'info',
  sleep: 'neutral',
  log: 'neutral',
};

export const STEP_TYPE_ICON_MAP: Record<string, string> = {
  script: 'lucide:code',
  condition: 'lucide:git-branch',
  query: 'lucide:search',
  delete: 'lucide:trash-2',
  http: 'lucide:globe',
  trigger_flow: 'lucide:workflow',
  sleep: 'lucide:clock',
  log: 'lucide:file-text',
  trigger: 'lucide:play',
  add: 'lucide:plus',
};

export const EXECUTION_STATUS_COLOR_MAP: Record<string, BadgeColor> = {
  pending: 'neutral',
  running: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

export const EXECUTION_STATUS_DOT_CLASS_MAP: Record<string, string> = {
  pending: 'bg-gray-400',
  running: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-yellow-500',
};

export const TRIGGER_TYPE_COLOR_MAP: Record<string, BadgeColor> = {
  schedule: 'info',
  manual: 'neutral',
};

export function getStepTypeColor(stepType: string): BadgeColor {
  return STEP_TYPE_COLOR_MAP[stepType] || 'neutral';
}

export function getStepTypeIcon(stepType: string): string {
  return STEP_TYPE_ICON_MAP[stepType] || 'lucide:circle';
}

export function getExecutionStatusColor(status: string): BadgeColor {
  return EXECUTION_STATUS_COLOR_MAP[status] || 'neutral';
}

export function getExecutionStatusDotClass(status: string): string {
  return EXECUTION_STATUS_DOT_CLASS_MAP[status] || 'bg-gray-400';
}

export function getTriggerColor(triggerType: string): BadgeColor {
  return TRIGGER_TYPE_COLOR_MAP[triggerType] || 'neutral';
}

export function getStepTimelineIcon(s: { status: string; type: string }): string {
  if (s.status === 'completed' && s.type === 'condition') return 'i-lucide-git-branch';
  if (s.status === 'completed') return 'i-lucide-check-circle';
  if (s.status === 'failed') return 'i-lucide-x-circle';
  if (s.status === 'skipped') return 'i-lucide-minus-circle';
  return 'i-lucide-circle';
}

export function getStepTimelineIconColor(s: { status: string }): string {
  if (s.status === 'completed') return 'text-green-500';
  if (s.status === 'failed') return 'text-red-500';
  if (s.status === 'skipped') return 'text-gray-400';
  return 'text-gray-300';
}

export function getStepTimelineClass(s: { status: string }): string {
  if (s.status === 'completed') return 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700';
  if (s.status === 'failed') return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  if (s.status === 'skipped') return 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700 opacity-60';
  return 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700';
}

export const NODE_WIDTH = 220;
export const NODE_SPACING_Y = 100;
export const CENTER_X = 200;
export const START_Y = 30;
export const BRANCH_OFFSET_X = 260;

export const EDGE_STYLE_DEFAULT = { stroke: '#94a3b8', strokeWidth: 2 };
export const EDGE_STYLE_TRUE = { stroke: '#22c55e', strokeWidth: 2 };
export const EDGE_STYLE_FALSE = { stroke: '#ef4444', strokeWidth: 2 };
export const EDGE_STYLE_TRUE_DASHED = { stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4' };
export const EDGE_STYLE_FALSE_DASHED = { stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4' };

export const EDGE_LABEL_STYLE_TRUE = { fill: '#22c55e', fontSize: 13, fontWeight: 700 };
export const EDGE_LABEL_STYLE_FALSE = { fill: '#ef4444', fontSize: 13, fontWeight: 700 };
