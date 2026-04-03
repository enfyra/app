import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useAdminSocket() {
  const toast = useToast();

  if (!socket) {
    socket = io('/enfyra-admin', {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
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

    socket.on('$system:metadata:reloaded', () => {
      setTimeout(async () => {
        const { forceRefreshSchema, schemas } = useSchema();
        const { loadRoutes } = useRoutes();
        const { registerDataMenuItems } = useMenuRegistry();

        await forceRefreshSchema();
        await loadRoutes();
        await registerDataMenuItems(Object.values(schemas.value));
      }, 1000);
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

  return { adminSocket: socket };
}
