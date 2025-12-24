import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateRoomCode } from '@/lib/utils';
import { z } from 'zod';

const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
  maxPlayers: z.number().min(2).max(20).default(8),
  maxTurns: z.number().min(1).max(50).default(10),
});

// Create a new room
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, maxPlayers, maxTurns } = createRoomSchema.parse(body);

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
      return NextResponse.json(
        { error: 'Failed to generate unique room code' },
        { status: 500 }
      );
    }

    // Create room and add host as participant
    const room = await prisma.gameRoom.create({
      data: {
        code,
        name: name.trim(),
        hostId: session.user.id,
        maxPlayers,
        maxTurns,
        participants: {
          create: {
            userId: session.user.id,
            turnOrder: 0,
          },
        },
      },
      include: {
        host: {
          select: { id: true, name: true, image: true },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

// Get user's rooms
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await prisma.roomParticipant.findMany({
      where: { userId: session.user.id, isActive: true },
      include: {
        room: {
          include: {
            host: { select: { id: true, name: true, image: true } },
            _count: {
              select: { participants: { where: { isActive: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return NextResponse.json({
      rooms: rooms.map(r => ({
        id: r.room.id,
        code: r.room.code,
        name: r.room.name,
        status: r.room.status,
        host: r.room.host,
        participantCount: r.room._count.participants,
        isHost: r.room.hostId === session.user.id,
        joinedAt: r.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json({ error: 'Failed to get rooms' }, { status: 500 });
  }
}
