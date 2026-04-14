import { io, type Socket } from 'socket.io-client';

import { ENFYRA_SOCKET_AUTH_ERROR } from '~/constants/enfyra';

let socket: Socket | null = null;
export const metadataReloading = ref(false);
export const metadataReloadDone = ref(false);
export const metadataReloadCountdown = ref(0);
let reloadDoneTimer: ReturnType<typeof setTimeout> | null = null;
let countdownInterval: ReturnType<typeof setInterval> | null = null;

function clearReloadTimers() {
  if (reloadDoneTimer) {
    clearTimeout(reloadDoneTimer);
    reloadDoneTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

export function dismissMetadataBanner() {
  metadataReloadDone.value = false;
  metadataReloadCountdown.value = 0;
  clearReloadTimers();
}

export function useAdminSocket() {
  const notify = useNotify();
  const schema = useSchema();
  const routes = useRoutes();
  const menuRegistry = useMenuRegistry();

  if (!socket) {
    socket = io('/ws/enfyra-admin', {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30_000,
    });

    const shouldToastConnection = () => {
      if (typeof document === 'undefined') return true;
      if (document.visibilityState !== 'visible') return false;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
      return true;
    };

    socket.on('connect', () => {
      console.log('Connected to admin socket');
    });

    socket.on('connect_error', (err: Error) => {
      if (err?.message === ENFYRA_SOCKET_AUTH_ERROR) return;
      if (!shouldToastConnection()) return;
      console.error('Connection error:', err);
    });

    socket.on('disconnect', (_reason: string) => {
      if (!shouldToastConnection()) return;
    });

    socket.io.on('reconnect', () => {
      if (!shouldToastConnection()) return;
    });

    socket.io.on('reconnect_failed', () => {
      if (!shouldToastConnection()) return;
    });

    socket.on('$system:metadata:reload', async (data: { status: string }) => {
      if (data.status === 'pending') {
        metadataReloading.value = true;
        dismissMetadataBanner();
      } else if (data.status === 'done') {
        await schema.forceRefreshSchema();
        await routes.loadRoutes();
        await menuRegistry.registerDataMenuItems(Object.values(schema.schemas.value));
        metadataReloading.value = false;
        metadataReloadDone.value = true;
        clearReloadTimers();
        metadataReloadCountdown.value = 5;
        countdownInterval = setInterval(() => {
          metadataReloadCountdown.value--;
          if (metadataReloadCountdown.value <= 0) {
            clearInterval(countdownInterval!);
            countdownInterval = null;
          }
        }, 1000);
        reloadDoneTimer = setTimeout(() => {
          metadataReloadDone.value = false;
          metadataReloadCountdown.value = 0;
          reloadDoneTimer = null;
        }, 5000);
      }
    });

    socket.on('$system:package:installed', (data: any) => {
      notify.success('Package ready', `${data.name}@${data.version} installed successfully`);
    });

    socket.on('$system:package:uninstalled', (data: any) => {
      notify.success('Package removed', `${data.name} has been uninstalled`);
    });

    socket.on('$system:package:failed', (data: any) => {
      notify.error('Package operation failed', data.error || `Failed to ${data.operation} ${data.name}`);
    });
  }

  return { adminSocket: socket, metadataReloading };
}
