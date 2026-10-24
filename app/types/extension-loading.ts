import type { FeatureExtensionRuntime } from './feature-api';

export type ExtensionCacheInvalidationReason = 'created' | 'updated' | 'deleted' | 'status';

export interface ExtensionCacheInvalidation {
  token: number;
  reason: ExtensionCacheInvalidationReason;
  id?: string | number | null;
  extensionId?: string | number | null;
  path?: string | null;
  updatedAt?: string | Date | null;
}

export interface ExtensionPreparationOptions {
  checkpoint?: () => Promise<void>;
  speculative?: () => boolean;
}

export interface ExtensionWarmContext {
  signal: AbortSignal;
  checkpoint: () => Promise<void>;
  isForeground: () => boolean;
}

export interface ExtensionWarmTask {
  key: string;
  run: (context: ExtensionWarmContext) => Promise<void>;
}

export interface ExtensionLoadSchedulerOptions {
  schedule: (callback: () => void) => () => void;
}

export interface ExtensionLoadScheduler {
  setReady: (ready: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setCandidates: (tasks: ExtensionWarmTask[]) => void;
  prefetch: (task: ExtensionWarmTask) => Promise<void>;
  beginForeground: (key: string) => () => void;
  invalidate: () => void;
  dispose: () => void;
}

export interface ExtensionLoadingController {
  loadMenuExtension: (menuId: string, refresh?: boolean) => Promise<FeatureExtensionRuntime | null>;
  beginForeground: (key: string) => () => void;
  setReady: (ready: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  refreshCandidates: () => void;
  prefetchForPath: (path?: string) => Promise<void>;
  schedulePrefetchIntent: (path?: string) => void;
  cancelPrefetchIntent: () => void;
  invalidate: () => void;
  dispose: () => void;
}

export interface ExtensionConnection extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
}
