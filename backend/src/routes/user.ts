import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

const router = Router();

// Get user profile
router.get('/profile', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      statistics: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      createdAt: user.createdAt,
      statistics: user.statistics,
    },
  });
}));

// Update user profile
router.patch('/profile', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { displayName } = req.body;

  const updateData: any = {};

  if (displayName !== undefined) {
    if (typeof displayName !== 'string' || displayName.length > 50) {
      throw new AppError('Display name must be a string with max 50 characters', 400);
    }
    updateData.displayName = displayName.trim() || null;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: { statistics: true },
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      statistics: user.statistics,
    },
  });
}));

// Get user statistics
router.get('/stats', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const stats = await prisma.userStatistics.findUnique({
    where: { userId },
  });

  if (!stats) {
    throw new AppError('Statistics not found', 404);
  }

  res.json({ statistics: stats });
}));

// Get user's game history
router.get('/games', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { status, limit = 20, offset = 0 } = req.query;

  const where: any = {
    participants: {
      some: { userId },
    },
  };

  if (status) {
    where.status = status;
  }

  const [games, total] = await Promise.all([
    prisma.gameRoom.findMany({
      where,
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: {
          select: {
            turns: true,
            participants: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.gameRoom.count({ where }),
  ]);

  res.json({
    games: games.map(g => ({
      id: g.id,
      code: g.code,
      name: g.name,
      status: g.status,
      host: g.host,
      isHost: g.hostId === userId,
      turnCount: g._count.turns,
      participantCount: g._count.participants,
      createdAt: g.createdAt,
      endedAt: g.endedAt,
    })),
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
}));

// Get public user profile
router.get('/:username', asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      statistics: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      statistics: {
        gamesPlayed: user.statistics?.gamesPlayed || 0,
        gamesHosted: user.statistics?.gamesHosted || 0,
        totalTurns: user.statistics?.totalTurns || 0,
      },
    },
  });
}));

// Leaderboard
router.get('/stats/leaderboard', asyncHandler(async (req: Request, res: Response) => {
  const { sortBy = 'gamesPlayed', limit = 10 } = req.query;

  const validSortFields = ['gamesPlayed', 'gamesHosted', 'totalTurns'];
  if (!validSortFields.includes(sortBy as string)) {
    throw new AppError('Invalid sort field', 400);
  }

  const leaders = await prisma.userStatistics.findMany({
    orderBy: { [sortBy as string]: 'desc' },
    take: Number(limit),
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  res.json({
    leaderboard: leaders.map((l, index) => ({
      rank: index + 1,
      user: l.user,
      gamesPlayed: l.gamesPlayed,
      gamesHosted: l.gamesHosted,
      totalTurns: l.totalTurns,
    })),
  });
}));

export { router as userRouter };
