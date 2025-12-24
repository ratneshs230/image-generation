import { Router, Request, Response } from 'express';
import multer from 'multer';
import { isAuthenticated, isRoomHost, isRoomParticipant } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { gameService } from '../services/gameService';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Start a game
router.post(
  '/:roomId/start',
  isAuthenticated,
  isRoomHost,
  upload.single('initialImage'),
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { prompt } = req.body;
    const userId = req.user!.id;

    let initialImageBase64: string | undefined;

    // Handle uploaded image
    if (req.file) {
      initialImageBase64 = req.file.buffer.toString('base64');
    }

    // Need either image or prompt
    if (!initialImageBase64 && !prompt) {
      throw new AppError('Please provide either an initial image or a text prompt', 400);
    }

    const gameState = await gameService.startGame(
      roomId,
      userId,
      prompt,
      initialImageBase64
    );

    // Emit socket event
    const io = req.app.get('io');
    io.to(roomId).emit('game:started', { gameState });

    logger.info(`Game started in room ${gameState.roomCode}`);

    res.json({ gameState });
  })
);

// Submit a turn (prompt)
router.post(
  '/:roomId/turn',
  isAuthenticated,
  isRoomParticipant,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { prompt } = req.body;
    const userId = req.user!.id;

    if (!prompt || typeof prompt !== 'string') {
      throw new AppError('Prompt is required', 400);
    }

    const io = req.app.get('io');
    const gameState = await gameService.processTurn(roomId, userId, prompt, io);

    // Emit appropriate event based on game state
    if (gameState.status === 'COMPLETED') {
      io.to(roomId).emit('game:completed', { gameState });
    } else {
      io.to(roomId).emit('game:turnCompleted', { gameState });
    }

    res.json({ gameState });
  })
);

// End game early
router.post(
  '/:roomId/end',
  isAuthenticated,
  isRoomHost,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const gameState = await gameService.endGame(roomId, userId);

    // Emit socket event
    const io = req.app.get('io');
    io.to(roomId).emit('game:completed', { gameState });

    res.json({ gameState });
  })
);

// Get current game state
router.get(
  '/:roomId/state',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const gameState = await gameService.getGameState(roomId);

    if (!gameState) {
      throw new AppError('Game not found', 404);
    }

    res.json({ gameState });
  })
);

// Get game history (for completed games)
router.get(
  '/:roomId/history',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const history = await gameService.getGameHistory(roomId);

    res.json({ history });
  })
);

// Skip turn (for timeout or voluntary skip)
router.post(
  '/:roomId/skip',
  isAuthenticated,
  isRoomHost,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const gameState = await gameService.getGameState(roomId);

    if (!gameState) {
      throw new AppError('Game not found', 404);
    }

    if (gameState.status !== 'IN_PROGRESS') {
      throw new AppError('Game is not in progress', 400);
    }

    // Find next player
    const currentIndex = gameState.participants.findIndex(
      p => p.id === gameState.currentPlayerId
    );
    const nextIndex = (currentIndex + 1) % gameState.participants.length;
    const nextPlayer = gameState.participants[nextIndex];

    // Update current player
    const prisma = (await import('../utils/prisma')).default;
    await prisma.gameRoom.update({
      where: { id: roomId },
      data: { currentPlayerId: nextPlayer.id },
    });

    const updatedState = await gameService.getGameState(roomId);

    // Emit socket event
    const io = req.app.get('io');
    io.to(roomId).emit('game:turnSkipped', {
      skippedPlayerId: gameState.currentPlayerId,
      gameState: updatedState,
    });

    res.json({ gameState: updatedState });
  })
);

export { router as gameRouter };
