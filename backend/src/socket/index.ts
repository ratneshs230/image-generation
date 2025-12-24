import { Server, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import { gameService } from '../services/gameService';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

// Track connected users by room
const roomUsers = new Map<string, Set<string>>();

export function setupSocketHandlers(io: Server) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token as string);
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (error) {
      logger.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User ${socket.username} connected (socket: ${socket.id})`);

    // Join a room
    socket.on('room:join', async (roomId: string) => {
      try {
        // Verify user is a participant
        const participant = await prisma.roomParticipant.findUnique({
          where: {
            roomId_userId: {
              roomId,
              userId: socket.userId!,
            },
          },
        });

        if (!participant || !participant.isActive) {
          socket.emit('error', { message: 'You are not a participant in this room' });
          return;
        }

        // Join socket room
        socket.join(roomId);

        // Track user in room
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Set());
        }
        roomUsers.get(roomId)!.add(socket.userId!);

        // Notify others
        socket.to(roomId).emit('room:userConnected', {
          userId: socket.userId,
          username: socket.username,
          onlineCount: roomUsers.get(roomId)!.size,
        });

        // Send current game state
        const gameState = await gameService.getGameState(roomId);
        socket.emit('room:joined', {
          roomId,
          gameState,
          onlineUsers: Array.from(roomUsers.get(roomId)!),
        });

        logger.info(`User ${socket.username} joined room ${roomId}`);
      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave a room
    socket.on('room:leave', (roomId: string) => {
      handleLeaveRoom(socket, roomId);
    });

    // Chat message in room
    socket.on('room:chat', async (data: { roomId: string; message: string }) => {
      const { roomId, message } = data;

      if (!message || message.trim().length === 0 || message.length > 500) {
        return;
      }

      // Verify user is in room
      if (!roomUsers.get(roomId)?.has(socket.userId!)) {
        return;
      }

      io.to(roomId).emit('room:chatMessage', {
        userId: socket.userId,
        username: socket.username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on('room:typing', (roomId: string) => {
      socket.to(roomId).emit('room:userTyping', {
        userId: socket.userId,
        username: socket.username,
      });
    });

    // Request current game state
    socket.on('game:getState', async (roomId: string) => {
      try {
        const gameState = await gameService.getGameState(roomId);
        socket.emit('game:state', { gameState });
      } catch (error) {
        socket.emit('error', { message: 'Failed to get game state' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User ${socket.username} disconnected`);

      // Remove from all rooms
      roomUsers.forEach((users, roomId) => {
        if (users.has(socket.userId!)) {
          handleLeaveRoom(socket, roomId);
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.username}:`, error);
    });
  });

  // Helper function to handle leaving a room
  function handleLeaveRoom(socket: AuthenticatedSocket, roomId: string) {
    socket.leave(roomId);

    const users = roomUsers.get(roomId);
    if (users) {
      users.delete(socket.userId!);

      if (users.size === 0) {
        roomUsers.delete(roomId);
      } else {
        // Notify others
        socket.to(roomId).emit('room:userDisconnected', {
          userId: socket.userId,
          username: socket.username,
          onlineCount: users.size,
        });
      }
    }

    logger.info(`User ${socket.username} left room ${roomId}`);
  }

  // Cleanup function for stale connections
  setInterval(() => {
    // Clean up empty rooms
    roomUsers.forEach((users, roomId) => {
      if (users.size === 0) {
        roomUsers.delete(roomId);
      }
    });
  }, 60000); // Every minute

  return io;
}

// Get online users for a room
export function getRoomOnlineUsers(roomId: string): string[] {
  return Array.from(roomUsers.get(roomId) || []);
}

// Broadcast to room
export function broadcastToRoom(io: Server, roomId: string, event: string, data: any) {
  io.to(roomId).emit(event, data);
}
