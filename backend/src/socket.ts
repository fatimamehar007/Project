import { Server } from 'socket.io';
import { socketAuth } from '@/middleware/auth';
import { logger } from '@/utils/logger';

let io: Server;

// Initialize Socket.IO
export const setupSocketHandlers = (socketIo: Server) => {
  io = socketIo;

  // Add authentication middleware
  io.use(socketAuth);

  // Handle connections
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join user's room
    socket.join(`user:${socket.user.id}`);

    // Join conversation room if provided
    const conversationId = socket.handshake.query.conversationId;
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // Handle conversation join
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.info(
        `Socket ${socket.id} joined conversation: ${conversationId}`
      );
    });

    // Handle conversation leave
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info(
        `Socket ${socket.id} left conversation: ${conversationId}`
      );
    });
  });
};

// Emit typing indicator
export const emitTyping = (conversationId: string) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('typing');
};

// Emit new message
export const emitMessage = (
  conversationId: string,
  message: {
    content: string;
    sender: 'user' | 'ai';
    language: string;
    confidence?: number;
    timestamp: Date;
  }
) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('message', message);
};

// Emit conversation status change
export const emitConversationStatus = (
  conversationId: string,
  status: 'active' | 'completed' | 'abandoned'
) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('conversation:status', status);
};

// Emit form data update
export const emitFormData = (
  conversationId: string,
  formData: Record<string, any>
) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('form:data', formData);
};

// Emit error
export const emitError = (
  conversationId: string,
  error: { message: string; code?: string }
) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('error', error);
};

// Emit notification to user
export const emitNotification = (
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
};

// Get active connections count
export const getActiveConnections = () => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};

// Get active users count
export const getActiveUsers = () => {
  if (!io) return 0;
  return new Set(
    Array.from(io.sockets.sockets.values()).map(
      (socket: any) => socket.user.id
    )
  ).size;
};

// Get active conversations
export const getActiveConversations = () => {
  if (!io) return [];
  return Array.from(io.sockets.adapter.rooms.keys()).filter((room) =>
    room.startsWith('conversation:')
  );
}; 