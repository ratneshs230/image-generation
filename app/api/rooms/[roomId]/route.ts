import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { pusherServer, getChannelName, PUSHER_EVENTS } from '@/lib/pusher';

// Get room by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: {
        host: { select: { id: true, name: true, image: true } },
        participants: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { turnOrder: 'asc' },
        },
        turns: {
          include: {
            player: { select: { id: true, name: true, image: true } },
          },
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'Failed to get room' }, { status: 500 });
  }
}

// Join room
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: { participants: { where: { isActive: true } } },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Cannot join a game in progress' },
        { status: 400 }
      );
    }

    if (room.participants.length >= room.maxPlayers) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 });
    }

    // Check if already a participant
    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId: params.roomId, userId: session.user.id } },
    });

    if (existingParticipant) {
      if (existingParticipant.isActive) {
        return NextResponse.json(
          { error: 'Already in this room' },
          { status: 400 }
        );
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
          roomId: params.roomId,
          userId: session.user.id,
          turnOrder: maxTurnOrder + 1,
        },
      });
    }

    // Notify via Pusher
    await pusherServer.trigger(
      getChannelName.room(params.roomId),
      PUSHER_EVENTS.PLAYER_JOINED,
      {
        user: {
          id: session.user.id,
          name: session.user.name,
          image: session.user.image,
        },
      }
    );

    return NextResponse.json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}

// Leave room
export async function DELETE(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId === session.user.id) {
      return NextResponse.json(
        { error: 'Host cannot leave. End the game instead.' },
        { status: 400 }
      );
    }

    await prisma.roomParticipant.update({
      where: {
        roomId_userId: { roomId: params.roomId, userId: session.user.id },
      },
      data: { isActive: false, leftAt: new Date() },
    });

    // Notify via Pusher
    await pusherServer.trigger(
      getChannelName.room(params.roomId),
      PUSHER_EVENTS.PLAYER_LEFT,
      {
        userId: session.user.id,
        name: session.user.name,
      }
    );

    return NextResponse.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    return NextResponse.json({ error: 'Failed to leave room' }, { status: 500 });
  }
}
