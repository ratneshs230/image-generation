import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      provider: string;
      providerId: string;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

// Check if user is authenticated (session-based)
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Check for JWT token as fallback
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      prisma.user.findUnique({ where: { id: decoded.userId } })
        .then(user => {
          if (user) {
            req.user = user;
            return next();
          }
          res.status(401).json({ error: 'Unauthorized' });
        })
        .catch(() => {
          res.status(401).json({ error: 'Unauthorized' });
        });
      return;
    } catch {
      // Token invalid
    }
  }

  res.status(401).json({ error: 'Authentication required' });
}

// Generate JWT token
export function generateToken(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
  } catch {
    return null;
  }
}

// Check if user is host of a room
export async function isRoomHost(req: Request, res: Response, next: NextFunction) {
  const roomId = req.params.roomId;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
    select: { hostId: true },
  });

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.hostId !== userId) {
    return res.status(403).json({ error: 'Only the host can perform this action' });
  }

  next();
}

// Check if user is participant in a room
export async function isRoomParticipant(req: Request, res: Response, next: NextFunction) {
  const roomId = req.params.roomId;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  if (!participant || !participant.isActive) {
    return res.status(403).json({ error: 'You are not a participant in this room' });
  }

  next();
}
