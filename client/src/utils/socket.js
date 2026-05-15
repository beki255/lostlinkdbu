import { io } from 'socket.io-client';
import { getToken } from './auth';

let socket = null;

export const getChatSocket = () => {
  if (socket?.connected) return socket;

  const token = getToken();
  if (!token) return null;

  socket = io('/chat', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
