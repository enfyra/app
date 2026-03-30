export type StepType = 'script' | 'condition' | 'query' | 'create' | 'update' | 'delete' | 'http' | 'trigger_flow' | 'sleep' | 'log';
export type StepErrorHandling = 'stop' | 'skip' | 'retry';
export type TriggerType = 'schedule' | 'manual';
export type BranchType = 'true' | 'false' | null;

export interface FlowStep {
  id: string | number;
  key: string;
  stepOrder: number;
  type: StepType | string;
  config?: Record<string, any>;
  timeout?: number;
  onError?: StepErrorHandling;
  retryAttempts?: number;
  isEnabled?: boolean;
  parentId?: string | number | null;
  parent?: { id: string | number } | null;
  branch?: BranchType;
}

export interface FlowDefinition {
  id: string | number;
  name: string;
  triggerType: TriggerType;
  triggerConfig?: Record<string, any>;
  timeout?: number;
  maxExecutions?: number;
  isEnabled: boolean;
}

export type StepNodeType = StepType | 'trigger' | 'add';

export interface StepNodeData {
  stepId?: string | number;
  label: string;
  stepType: StepNodeType;
  config?: Record<string, any>;
  timeout?: number;
  onError?: StepErrorHandling;
  retryAttempts?: number;
  enabled?: boolean;
  branch?: BranchType;
  parentId?: string | number | null;
  triggerInfo?: string;
  _addContext?: { parentId?: any; branch?: string; afterOrder?: number };
  execStatus?: 'completed' | 'failed' | 'running' | 'skipped' | null;
  execError?: string | null;
}
