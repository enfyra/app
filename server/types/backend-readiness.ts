export interface BackendReadinessOptions {
  timeoutMs?: number;
  intervalMs?: number;
  readyTtlMs?: number;
}

export interface BackendReadinessGate {
  wait(signal?: AbortSignal): Promise<void>;
}
