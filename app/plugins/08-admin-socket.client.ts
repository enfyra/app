import { io, type Socket } from 'socket.io-client';

export default defineNuxtPlugin(() => {
  const toast = useToast();

  const socket: Socket = io('/admin', {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connected', (data: any) => {
    toast.add({
      title: 'WebSocket',
      description: 'Connected to server',
      color: 'success',
    });
  });

  socket.on('connect_error', (err: Error) => {
    toast.add({
      title: 'WebSocket',
      description: `Connection failed: ${err.message}`,
      color: 'error',
    });
  });

  socket.on('disconnect', (reason: string) => {
    if (reason === 'io server disconnect' || reason === 'transport close') {
      toast.add({
        title: 'WebSocket',
        description: 'Disconnected from server',
        color: 'warning',
      });
    }
  });

  socket.io.on('reconnect', () => {
    toast.add({
      title: 'WebSocket',
      description: 'Reconnected',
      color: 'success',
    });
  });

  socket.io.on('reconnect_failed', () => {
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
