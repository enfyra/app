import { io, type Socket } from 'socket.io-client';

export default defineNuxtPlugin(() => {
  const toast = useToast();

  const shouldToastConnection = () => {
    if (typeof document === 'undefined') return true;
    if (document.visibilityState !== 'visible') return false;
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
    return true;
  };

  const socket: Socket = io('/enfyra-admin', {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect_error', (err: Error) => {
    if (!shouldToastConnection()) return;
    toast.add({
      title: 'WebSocket',
      description: `Connection failed: ${err.message}`,
      color: 'error',
    });
  });

  socket.on('disconnect', (reason: string) => {
    if (!shouldToastConnection()) return;
    if (reason === 'io server disconnect' || reason === 'transport close') {
      toast.add({
        title: 'WebSocket',
        description: 'Disconnected from server',
        color: 'warning',
      });
    }
  });

  socket.io.on('reconnect', () => {
    if (!shouldToastConnection()) return;
    toast.add({
      title: 'WebSocket',
      description: 'Reconnected',
      color: 'success',
    });
  });

  socket.io.on('reconnect_failed', () => {
    if (!shouldToastConnection()) return;
    toast.add({
      title: 'WebSocket',
      description: 'Reconnection failed after multiple attempts',
      color: 'error',
    });
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

  return {
    provide: {
      adminSocket: socket,
    },
  };
});
