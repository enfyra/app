import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
const metadataReloading = ref(false);

export function useAdminSocket() {
  const toast = useToast();
  const schema = useSchema();
  const routes = useRoutes();
  const menuRegistry = useMenuRegistry();

  if (!socket) {
    socket = io('/ws/enfyra-admin', {
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

    socket.on('$system:metadata:reload', async (data: { status: string }) => {
      if (data.status === 'pending') {
        metadataReloading.value = true;
      } else if (data.status === 'done') {
        await schema.forceRefreshSchema();
        await routes.loadRoutes();
        await menuRegistry.registerDataMenuItems(Object.values(schema.schemas.value));
        metadataReloading.value = false;
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
