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

  socket.on('connect', () => {
    console.log('Connected to admin socket');
  });

  socket.on('connect_error', (err: Error) => {
    if (!shouldToastConnection()) return;
    console.error('Connection error:', err);
  });

  socket.on('disconnect', (reason: string) => {
    if (!shouldToastConnection()) return;
  });

  socket.io.on('reconnect', () => {
    if (!shouldToastConnection()) return;
  });

  socket.io.on('reconnect_failed', () => {
    if (!shouldToastConnection()) return;
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
