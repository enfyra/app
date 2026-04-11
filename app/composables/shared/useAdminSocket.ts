import { io, type Socket } from 'socket.io-client';

import { ENFYRA_SOCKET_AUTH_ERROR } from '~/constants/enfyra';

let socket: Socket | null = null;
let metadataReloadHideTimer: ReturnType<typeof setTimeout> | null = null;
const METADATA_RELOAD_HIDE_MS = 200;
export const metadataReloading = ref(false);

export function useAdminSocket() {
  const toast = useToast();
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
        if (metadataReloadHideTimer) {
          clearTimeout(metadataReloadHideTimer);
          metadataReloadHideTimer = null;
        }
        metadataReloading.value = true;
      } else if (data.status === 'done') {
        await schema.forceRefreshSchema();
        await routes.loadRoutes();
        await menuRegistry.registerDataMenuItems(Object.values(schema.schemas.value));
        if (metadataReloadHideTimer) {
          clearTimeout(metadataReloadHideTimer);
        }
        metadataReloadHideTimer = setTimeout(() => {
          metadataReloading.value = false;
          metadataReloadHideTimer = null;
        }, METADATA_RELOAD_HIDE_MS);
      }
    });

    socket.on('$system:package:installed', (data: any) => {
      toast.add({
        title: 'Package ready',
        description: `${data.name}@${data.version} installed successfully`,
        color: 'success',
      });
    });

    socket.on('$system:package:uninstalled', (data: any) => {
      toast.add({
        title: 'Package removed',
        description: `${data.name} has been uninstalled`,
        color: 'success',
      });
    });

    socket.on('$system:package:failed', (data: any) => {
      toast.add({
        title: 'Package operation failed',
        description: data.error || `Failed to ${data.operation} ${data.name}`,
        color: 'error',
      });
    });
  }

  return { adminSocket: socket, metadataReloading };
}
