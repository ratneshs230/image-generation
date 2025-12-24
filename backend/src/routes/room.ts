import { Router, Request, Response } from 'express';
import { isAuthenticated, isRoomHost, isRoomParticipant } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { generateRoomCode, isValidRoomCode } from '../utils/roomCode';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

// Create a new room
router.post('/', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { name, maxPlayers = 8, maxTurns = 10 } = req.body;
  const userId = req.user!.id;

  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    throw new AppError('Room name is required', 400);
  }

  if (maxPlayers < 2 || maxPlayers > 20) {
    throw new AppError('Max players must be between 2 and 20', 400);
  }

  if (maxTurns < 1 || maxTurns > 50) {
    throw new AppError('Max turns must be between 1 and 50', 400);
  }

  // Generate unique room code
  let code: string;
  let attempts = 0;
  do {
    code = generateRoomCode();
    const existing = await prisma.gameRoom.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new AppError('Failed to generate unique room code', 500);
  }

  // Create room and add host as first participant
  const room = await prisma.gameRoom.create({
    data: {
      code,
      name: name.trim(),
      hostId: userId,
      maxPlayers,
      maxTurns,
      participants: {
        create: {
          userId,
          turnOrder: 0,
        },
      },
    },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      participants: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  logger.info(`Room ${code} created by ${req.user!.username}`);

  res.status(201).json({
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      status: room.status,
      maxPlayers: room.maxPlayers,
      maxTurns: room.maxTurns,
      host: room.host,
      participants: room.participants.map(p => ({
        ...p.user,
        turnOrder: p.turnOrder,
      })),
    },
  });
}));

// Get room by code
router.get('/code/:code', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;

  if (!isValidRoomCode(code)) {
    throw new AppError('Invalid room code format', 400);
  }

  const room = await prisma.gameRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      participants: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { turnOrder: 'asc' },
      },
    },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  res.json({
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      status: room.status,
      maxPlayers: room.maxPlayers,
      maxTurns: room.maxTurns,
      currentTurn: room.currentTurn,
      host: room.host,
      participantCount: room.participants.length,
      participants: room.participants.map(p => ({
        ...p.user,
        turnOrder: p.turnOrder,
      })),
    },
  });
}));

// Get room by ID
router.get('/:roomId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      participants: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { turnOrder: 'asc' },
      },
      turns: {
        select: { turnNumber: true, prompt: true, outputImageUrl: true, createdAt: true },
        orderBy: { turnNumber: 'asc' },
      },
    },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  res.json({
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      status: room.status,
      maxPlayers: room.maxPlayers,
      maxTurns: room.maxTurns,
      currentTurn: room.currentTurn,
      currentPlayerId: room.currentPlayerId,
      currentImageUrl: room.currentImageUrl,
      host: room.host,
      participants: room.participants.map(p => ({
        ...p.user,
        turnOrder: p.turnOrder,
      })),
      turns: room.turns,
    },
  });
}));

// Join a room
router.post('/:roomId/join', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.id;

  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { where: { isActive: true } },
    },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  if (room.status !== 'WAITING') {
    throw new AppError('Cannot join a game in progress or completed', 400);
  }

  if (room.participants.length >= room.maxPlayers) {
    throw new AppError('Room is full', 400);
  }

  // Check if already a participant
  const existingParticipant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (existingParticipant) {
    if (existingParticipant.isActive) {
      throw new AppError('You are already in this room', 400);
    }
    // Reactivate participant
    await prisma.roomParticipant.update({
      where: { id: existingParticipant.id },
      data: { isActive: true, leftAt: null },
    });
  } else {
    // Add new participant
    const maxTurnOrder = Math.max(...room.participants.map(p => p.turnOrder), -1);
    await prisma.roomParticipant.create({
      data: {
        roomId,
        userId,
        turnOrder: maxTurnOrder + 1,
      },
    });
  }

  // Get updated room
  const updatedRoom = await prisma.gameRoom.findUnique({
    where: { id: roomId },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      participants: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { turnOrder: 'asc' },
      },
    },
  });

  // Emit socket event
  const io = req.app.get('io');
  io.to(roomId).emit('room:playerJoined', {
    user: {
      id: req.user!.id,
      username: req.user!.username,
      displayName: req.user!.displayName,
      avatarUrl: req.user!.avatarUrl,
    },
    participantCount: updatedRoom!.participants.length,
  });

  logger.info(`User ${req.user!.username} joined room ${room.code}`);

  res.json({
    message: 'Joined room successfully',
    room: {
      id: updatedRoom!.id,
      code: updatedRoom!.code,
      name: updatedRoom!.name,
      status: updatedRoom!.status,
      host: updatedRoom!.host,
      participants: updatedRoom!.participants.map(p => ({
        ...p.user,
        turnOrder: p.turnOrder,
      })),
    },
  });
}));

// Leave a room
router.post('/:roomId/leave', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.id;

  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  // Host cannot leave, must end the game
  if (room.hostId === userId) {
    throw new AppError('Host cannot leave. End the game instead.', 400);
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!participant || !participant.isActive) {
    throw new AppError('You are not in this room', 400);
  }

  // Mark as inactive
  await prisma.roomParticipant.update({
    where: { id: participant.id },
    data: { isActive: false, leftAt: new Date() },
  });

  // If game is in progress and it's this player's turn, skip to next
  if (room.status === 'IN_PROGRESS' && room.currentPlayerId === userId) {
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId, isActive: true },
      orderBy: { turnOrder: 'asc' },
    });

    if (participants.length > 0) {
      await prisma.gameRoom.update({
        where: { id: roomId },
        data: { currentPlayerId: participants[0].userId },
      });
    }
  }

  // Emit socket event
  const io = req.app.get('io');
  io.to(roomId).emit('room:playerLeft', {
    userId,
    username: req.user!.username,
  });

  logger.info(`User ${req.user!.username} left room ${room.code}`);

  res.json({ message: 'Left room successfully' });
}));

// Update room settings (host only)
router.patch('/:roomId', isAuthenticated, isRoomHost, asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { name, maxPlayers, maxTurns } = req.body;

  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  if (room.status !== 'WAITING') {
    throw new AppError('Cannot update room settings after game has started', 400);
  }

  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (maxPlayers) updateData.maxPlayers = maxPlayers;
  if (maxTurns) updateData.maxTurns = maxTurns;

  const updatedRoom = await prisma.gameRoom.update({
    where: { id: roomId },
    data: updateData,
  });

  // Emit socket event
  const io = req.app.get('io');
  io.to(roomId).emit('room:updated', { room: updatedRoom });

  res.json({ room: updatedRoom });
}));

// Get user's rooms
router.get('/user/my-rooms', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const rooms = await prisma.roomParticipant.findMany({
    where: { userId, isActive: true },
    include: {
      room: {
        include: {
          host: {
            select: { id: true, username: true, displayName: true },
          },
          _count: {
            select: { participants: { where: { isActive: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  res.json({
    rooms: rooms.map(r => ({
      id: r.room.id,
      code: r.room.code,
      name: r.room.name,
      status: r.room.status,
      host: r.room.host,
      participantCount: r.room._count.participants,
      isHost: r.room.hostId === userId,
      joinedAt: r.joinedAt,
    })),
  });
}));

export { router as roomRouter };
