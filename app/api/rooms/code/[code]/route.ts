import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isValidRoomCode } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidRoomCode(params.code)) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    const room = await prisma.gameRoom.findUnique({
      where: { code: params.code.toUpperCase() },
      include: {
        host: { select: { id: true, name: true, image: true } },
        participants: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { turnOrder: 'asc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
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
  } catch (error) {
    console.error('Get room by code error:', error);
    return NextResponse.json({ error: 'Failed to get room' }, { status: 500 });
  }
}
