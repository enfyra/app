import { isTransientNetworkError } from '../utils/transient-network-error';

const LISTENER_KEY = Symbol.for('enfyra.transient-network-errors.listener');

export default defineNitroPlugin(() => {
  if ((globalThis as Record<symbol, boolean>)[LISTENER_KEY]) return;
  (globalThis as Record<symbol, boolean>)[LISTENER_KEY] = true;

  process.on('unhandledRejection', (reason) => {
    if (isTransientNetworkError(reason)) return;
    throw reason;
  });
});
