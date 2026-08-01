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
  event: 'warning',
  webhook: 'success',
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
  if (s.status === 'skipped') return 'eapp-text-quaternary';
  return 'eapp-text-tertiary';
}

export function getStepTimelineClass(s: { status: string }): string {
  if (s.status === 'completed') return 'eapp-surface-muted border-[var(--border-default)]';
  if (s.status === 'failed') return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  if (s.status === 'skipped') return 'eapp-surface-muted border-[var(--border-default)] opacity-60';
  return 'eapp-surface-muted border-[var(--border-default)]';
}

export const NODE_SPACING_X = 300;
export const CENTER_Y = 300;
export const START_X = 40;
export const BRANCH_OFFSET_Y = 160;

export const EDGE_STYLE_DEFAULT = { stroke: 'var(--flow-edge)', strokeWidth: 1.5 };
export const EDGE_STYLE_TRUE = { stroke: 'var(--st-success)', strokeWidth: 1.5 };
export const EDGE_STYLE_FALSE = { stroke: 'var(--md-error)', strokeWidth: 1.5 };
export const EDGE_STYLE_TRUE_DASHED = { stroke: 'var(--st-success)', strokeWidth: 1.5, strokeDasharray: '6 4' };
export const EDGE_STYLE_FALSE_DASHED = { stroke: 'var(--md-error)', strokeWidth: 1.5, strokeDasharray: '6 4' };

export const EDGE_LABEL_STYLE_TRUE = { fill: 'var(--st-success)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' };
export const EDGE_LABEL_STYLE_FALSE = { fill: 'var(--md-error)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' };
