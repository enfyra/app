import type { ExtensionLoadScheduler, ExtensionLoadSchedulerOptions, ExtensionWarmTask } from '~/types/extension-loading';

type Entry = {
  task: ExtensionWarmTask;
  controller: AbortController;
  promise: Promise<void>;
  resolve: () => void;
};

export function createExtensionLoadScheduler(options: ExtensionLoadSchedulerOptions): ExtensionLoadScheduler {
  let ready = false;
  let enabled = true;
  let disposed = false;
  let active: Entry | null = null;
  let cancelScheduled: (() => void) | null = null;
  const queue = new Map<string, Entry>();
  const attempted = new Set<string>();
  const foreground = new Map<string, number>();
  const checkpoints = new Set<() => void>();

  const canRun = () => !disposed && ready && enabled && foreground.size === 0;
  const cancel = () => { cancelScheduled?.(); cancelScheduled = null; };
  const wake = () => { for (const resume of [...checkpoints]) resume(); };

  function schedule() {
    cancel();
    if (!canRun() || (!queue.size && !checkpoints.size)) return;
    cancelScheduled = options.schedule(() => {
      cancelScheduled = null;
      if (!canRun()) return;
      if (checkpoints.size) {
        wake();
        return;
      }
      if (active) return;
      const entry = queue.values().next().value as Entry | undefined;
      if (!entry) return;
      queue.delete(entry.task.key);
      active = entry;
      const checkpoint = () => new Promise<void>((resolve, reject) => {
        const resume = () => {
          if (entry.controller.signal.aborted || disposed) {
            checkpoints.delete(resume);
            reject(new DOMException('Extension preparation cancelled', 'AbortError'));
          } else if (foreground.has(entry.task.key) || canRun()) {
            checkpoints.delete(resume);
            resolve();
          }
        };
        checkpoints.add(resume);
        if (foreground.has(entry.task.key) || entry.controller.signal.aborted) resume();
        else schedule();
      });
      void Promise.resolve().then(() => entry.task.run({
        signal: entry.controller.signal,
        checkpoint,
        isForeground: () => foreground.has(entry.task.key),
      })).catch(() => undefined).finally(() => {
        if (active === entry) active = null;
        entry.resolve();
        schedule();
      });
    });
  }

  function enqueue(task: ExtensionWarmTask, intent = false): Promise<void> {
    if (disposed) return Promise.resolve();
    if (active?.task.key === task.key && !active.controller.signal.aborted) return active.promise;
    const existing = queue.get(task.key);
    if (existing) {
      if (intent) {
        queue.delete(task.key);
        const rest = [...queue];
        queue.clear();
        queue.set(task.key, existing);
        for (const [key, entry] of rest) queue.set(key, entry);
      }
      schedule();
      return existing.promise;
    }
    if (attempted.has(task.key) || foreground.has(task.key)) return Promise.resolve();
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    const entry: Entry = { task, controller: new AbortController(), promise, resolve };
    if (intent) {
      const rest = [...queue];
      queue.clear();
      queue.set(task.key, entry);
      for (const [key, item] of rest) queue.set(key, item);
    } else queue.set(task.key, entry);
    attempted.add(task.key);
    schedule();
    return promise;
  }

  function invalidate() {
    cancel();
    active?.controller.abort();
    for (const entry of queue.values()) { entry.controller.abort(); entry.resolve(); }
    queue.clear();
    attempted.clear();
    wake();
  }

  return {
    setReady(value) { ready = value; schedule(); },
    setEnabled(value) { enabled = value; schedule(); },
    setCandidates(tasks) {
      const keys = new Set(tasks.map(task => task.key));
      for (const [key, entry] of queue) {
        if (keys.has(key)) continue;
        queue.delete(key);
        attempted.delete(key);
        entry.resolve();
      }
      for (const task of tasks) void enqueue(task);
      schedule();
    },
    prefetch: task => enqueue(task, true),
    beginForeground(key) {
      foreground.set(key, (foreground.get(key) ?? 0) + 1);
      const queued = queue.get(key);
      if (queued) { queue.delete(key); queued.resolve(); }
      cancel();
      wake();
      let ended = false;
      return () => {
        if (ended) return;
        ended = true;
        const count = (foreground.get(key) ?? 1) - 1;
        if (count > 0) foreground.set(key, count);
        else foreground.delete(key);
        schedule();
      };
    },
    invalidate,
    dispose() { disposed = true; invalidate(); foreground.clear(); },
  };
}
