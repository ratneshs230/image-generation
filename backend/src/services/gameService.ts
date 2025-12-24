import prisma from '../utils/prisma';
import { bananaApiService } from './bananaApi';
import { moderationService } from './moderation';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { Server } from 'socket.io';

export interface GameState {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: string;
  hostId: string;
  currentTurn: number;
  maxTurns: number;
  currentPlayerId: string | null;
  currentImageUrl: string | null;
  participants: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    turnOrder: number;
    isActive: boolean;
  }>;
  turns: Array<{
    turnNumber: number;
    playerId: string;
    playerName: string;
    prompt: string;
    imageUrl: string;
    createdAt: Date;
  }>;
}

export class GameService {
  // Get full game state
  async getGameState(roomId: string): Promise<GameState | null> {
    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { isActive: true },
          include: { user: true },
          orderBy: { turnOrder: 'asc' },
        },
        turns: {
          include: { player: true },
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    if (!room) return null;

    return {
      roomId: room.id,
      roomCode: room.code,
      roomName: room.name,
      status: room.status,
      hostId: room.hostId,
      currentTurn: room.currentTurn,
      maxTurns: room.maxTurns,
      currentPlayerId: room.currentPlayerId,
      currentImageUrl: room.currentImageUrl,
      participants: room.participants.map(p => ({
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
        turnOrder: p.turnOrder,
        isActive: p.isActive,
      })),
      turns: room.turns.map(t => ({
        turnNumber: t.turnNumber,
        playerId: t.playerId,
        playerName: t.player.username,
        prompt: t.prompt,
        imageUrl: t.outputImageUrl,
        createdAt: t.createdAt,
      })),
    };
  }

  // Start the game
  async startGame(
    roomId: string,
    hostId: string,
    initialPrompt?: string,
    initialImageBase64?: string
  ): Promise<GameState> {
    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: { where: { isActive: true } },
      },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.hostId !== hostId) {
      throw new AppError('Only the host can start the game', 403);
    }

    if (room.status !== 'WAITING') {
      throw new AppError('Game has already started or ended', 400);
    }

    if (room.participants.length < 1) {
      throw new AppError('Need at least 1 participant to start', 400);
    }

    // Generate or use initial image
    let imageBase64: string;
    const startTime = Date.now();

    if (initialImageBase64) {
      imageBase64 = initialImageBase64;
    } else if (initialPrompt) {
      // Validate and moderate prompt
      const formatCheck = moderationService.validatePromptFormat(initialPrompt);
      if (!formatCheck.valid) {
        throw new AppError(formatCheck.error!, 400);
      }

      const moderation = await moderationService.checkPrompt(initialPrompt, hostId, roomId);
      if (moderation.flagged) {
        throw new AppError(moderation.reason || 'Inappropriate prompt', 400);
      }

      imageBase64 = await bananaApiService.generateImage(moderation.cleanedPrompt);
    } else {
      throw new AppError('Either an initial image or prompt is required', 400);
    }

    const processingTime = Date.now() - startTime;

    // Store image (in production, upload to S3/CloudStorage)
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    // Get first player (sort by turn order)
    const sortedParticipants = room.participants.sort((a, b) => a.turnOrder - b.turnOrder);
    const firstPlayer = sortedParticipants[0];

    // Update room and create initial turn
    const [updatedRoom] = await prisma.$transaction([
      prisma.gameRoom.update({
        where: { id: roomId },
        data: {
          status: 'IN_PROGRESS',
          currentTurn: 1,
          currentPlayerId: firstPlayer.userId,
          currentImageUrl: imageUrl,
        },
      }),
      prisma.gameTurn.create({
        data: {
          roomId,
          playerId: hostId,
          turnNumber: 0, // Initial image is turn 0
          prompt: initialPrompt || 'Initial uploaded image',
          inputImageUrl: null,
          outputImageUrl: imageUrl,
          processingTime,
        },
      }),
      prisma.userStatistics.update({
        where: { userId: hostId },
        data: { gamesHosted: { increment: 1 } },
      }),
    ]);

    // Update participants' game stats
    for (const participant of room.participants) {
      await prisma.userStatistics.update({
        where: { userId: participant.userId },
        data: { gamesPlayed: { increment: 1 } },
      });
    }

    logger.info(`Game started in room ${room.code} by host ${hostId}`);

    const gameState = await this.getGameState(roomId);
    if (!gameState) {
      throw new AppError('Failed to get game state', 500);
    }

    return gameState;
  }

  // Process a player's turn
  async processTurn(
    roomId: string,
    playerId: string,
    prompt: string,
    io: Server
  ): Promise<GameState> {
    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: { where: { isActive: true }, orderBy: { turnOrder: 'asc' } },
      },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.status !== 'IN_PROGRESS') {
      throw new AppError('Game is not in progress', 400);
    }

    if (room.currentPlayerId !== playerId) {
      throw new AppError('It is not your turn', 403);
    }

    // Validate and moderate prompt
    const formatCheck = moderationService.validatePromptFormat(prompt);
    if (!formatCheck.valid) {
      throw new AppError(formatCheck.error!, 400);
    }

    const moderation = await moderationService.checkPrompt(prompt, playerId, roomId);
    if (moderation.flagged) {
      throw new AppError(moderation.reason || 'Inappropriate prompt', 400);
    }

    // Emit processing status
    io.to(roomId).emit('turn:processing', {
      playerId,
      prompt: moderation.cleanedPrompt,
    });

    // Get current image (remove data URL prefix)
    const currentImageBase64 = room.currentImageUrl?.replace(/^data:image\/\w+;base64,/, '') || '';

    // Generate edited image
    const startTime = Date.now();
    let newImageBase64: string;

    try {
      newImageBase64 = await bananaApiService.editImage(currentImageBase64, moderation.cleanedPrompt);
    } catch (error) {
      io.to(roomId).emit('turn:error', {
        playerId,
        error: error instanceof AppError ? error.message : 'Image generation failed',
      });
      throw error;
    }

    const processingTime = Date.now() - startTime;
    const newImageUrl = `data:image/png;base64,${newImageBase64}`;

    // Calculate next player
    const currentPlayerIndex = room.participants.findIndex(p => p.userId === playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % room.participants.length;
    const nextPlayer = room.participants[nextPlayerIndex];

    const newTurnNumber = room.currentTurn + 1;
    const isGameComplete = newTurnNumber > room.maxTurns;

    // Update database
    await prisma.$transaction([
      prisma.gameTurn.create({
        data: {
          roomId,
          playerId,
          turnNumber: room.currentTurn,
          prompt: moderation.cleanedPrompt,
          inputImageUrl: room.currentImageUrl,
          outputImageUrl: newImageUrl,
          processingTime,
        },
      }),
      prisma.gameRoom.update({
        where: { id: roomId },
        data: {
          currentTurn: newTurnNumber,
          currentPlayerId: isGameComplete ? null : nextPlayer.userId,
          currentImageUrl: newImageUrl,
          status: isGameComplete ? 'COMPLETED' : 'IN_PROGRESS',
          endedAt: isGameComplete ? new Date() : undefined,
        },
      }),
      prisma.userStatistics.update({
        where: { userId: playerId },
        data: { totalTurns: { increment: 1 } },
      }),
    ]);

    logger.info(`Turn ${room.currentTurn} completed in room ${room.code} by player ${playerId}`);

    const gameState = await this.getGameState(roomId);
    if (!gameState) {
      throw new AppError('Failed to get game state', 500);
    }

    return gameState;
  }

  // End the game early
  async endGame(roomId: string, hostId: string): Promise<GameState> {
    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.hostId !== hostId) {
      throw new AppError('Only the host can end the game', 403);
    }

    if (room.status === 'COMPLETED' || room.status === 'CANCELLED') {
      throw new AppError('Game has already ended', 400);
    }

    await prisma.gameRoom.update({
      where: { id: roomId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        currentPlayerId: null,
      },
    });

    logger.info(`Game ended in room ${room.code} by host ${hostId}`);

    const gameState = await this.getGameState(roomId);
    if (!gameState) {
      throw new AppError('Failed to get game state', 500);
    }

    return gameState;
  }

  // Get game history for replay/viewing
  async getGameHistory(roomId: string) {
    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { turnOrder: 'asc' },
        },
        turns: {
          include: {
            player: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    return {
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        status: room.status,
        createdAt: room.createdAt,
        endedAt: room.endedAt,
        maxTurns: room.maxTurns,
        totalTurns: room.turns.length,
      },
      host: room.host,
      participants: room.participants.map(p => ({
        ...p.user,
        turnOrder: p.turnOrder,
        joinedAt: p.joinedAt,
      })),
      turns: room.turns.map(t => ({
        turnNumber: t.turnNumber,
        player: t.player,
        prompt: t.prompt,
        imageUrl: t.outputImageUrl,
        processingTime: t.processingTime,
        createdAt: t.createdAt,
      })),
    };
  }
}

// Singleton instance
export const gameService = new GameService();
