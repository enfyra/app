import { io, type Socket } from 'socket.io-client';

export default defineNuxtPlugin(() => {
  const toast = useToast();

  const socket: Socket = io('/admin', {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connected', (data: any) => {
    console.log('[AdminSocket] Connected:', data);
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

  return {
    provide: {
      adminSocket: socket,
    },
  };
});
