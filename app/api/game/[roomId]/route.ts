import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { pusherServer, getChannelName, PUSHER_EVENTS } from '@/lib/pusher';
import { bananaApi } from '@/lib/banana-api';
import { checkPrompt, validatePromptFormat } from '@/lib/moderation';

// Get game state
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

    return NextResponse.json({
      gameState: {
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
          name: p.user.name,
          image: p.user.image,
          turnOrder: p.turnOrder,
        })),
        turns: room.turns.map(t => ({
          turnNumber: t.turnNumber,
          playerId: t.playerId,
          playerName: t.player.name,
          prompt: t.prompt,
          imageUrl: t.outputImageUrl,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json({ error: 'Failed to get game state' }, { status: 500 });
  }
}

// Start game
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
      include: { participants: { where: { isActive: true }, orderBy: { turnOrder: 'asc' } } },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the host can start the game' },
        { status: 403 }
      );
    }

    if (room.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Game already started' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const prompt = formData.get('prompt') as string | null;
    const imageFile = formData.get('initialImage') as File | null;

    let imageBase64: string;
    const startTime = Date.now();

    if (imageFile) {
      const buffer = await imageFile.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
    } else if (prompt) {
      const formatCheck = validatePromptFormat(prompt);
      if (!formatCheck.valid) {
        return NextResponse.json({ error: formatCheck.error }, { status: 400 });
      }

      const moderation = await checkPrompt(prompt, session.user.id, params.roomId);
      if (moderation.flagged) {
        return NextResponse.json({ error: moderation.reason }, { status: 400 });
      }

      imageBase64 = await bananaApi.generateImage(moderation.cleanedPrompt);
    } else {
      return NextResponse.json(
        { error: 'Initial image or prompt required' },
        { status: 400 }
      );
    }

    const processingTime = Date.now() - startTime;
    const imageUrl = `data:image/png;base64,${imageBase64}`;
    const firstPlayer = room.participants[0];

    // Update room and create initial turn
    await prisma.$transaction([
      prisma.gameRoom.update({
        where: { id: params.roomId },
        data: {
          status: 'IN_PROGRESS',
          currentTurn: 1,
          currentPlayerId: firstPlayer.userId,
          currentImageUrl: imageUrl,
        },
      }),
      prisma.gameTurn.create({
        data: {
          roomId: params.roomId,
          playerId: session.user.id,
          turnNumber: 0,
          prompt: prompt || 'Initial uploaded image',
          outputImageUrl: imageUrl,
          processingTime,
        },
      }),
    ]);

    // Notify via Pusher
    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: {
        participants: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { turnOrder: 'asc' },
        },
        turns: {
          include: { player: { select: { id: true, name: true, image: true } } },
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    await pusherServer.trigger(
      getChannelName.room(params.roomId),
      PUSHER_EVENTS.GAME_STARTED,
      { gameState: updatedRoom }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}

// Submit turn
export async function PUT(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();

    const room = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: { participants: { where: { isActive: true }, orderBy: { turnOrder: 'asc' } } },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Game not in progress' }, { status: 400 });
    }

    if (room.currentPlayerId !== session.user.id) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Validate prompt
    const formatCheck = validatePromptFormat(prompt);
    if (!formatCheck.valid) {
      return NextResponse.json({ error: formatCheck.error }, { status: 400 });
    }

    const moderation = await checkPrompt(prompt, session.user.id, params.roomId);
    if (moderation.flagged) {
      return NextResponse.json({ error: moderation.reason }, { status: 400 });
    }

    // Notify processing
    await pusherServer.trigger(
      getChannelName.room(params.roomId),
      PUSHER_EVENTS.TURN_PROCESSING,
      { playerId: session.user.id, prompt: moderation.cleanedPrompt }
    );

    // Generate image
    const currentImageBase64 = room.currentImageUrl?.replace(/^data:image\/\w+;base64,/, '') || '';
    const startTime = Date.now();
    const newImageBase64 = await bananaApi.editImage(currentImageBase64, moderation.cleanedPrompt);
    const processingTime = Date.now() - startTime;
    const newImageUrl = `data:image/png;base64,${newImageBase64}`;

    // Calculate next player
    const currentIndex = room.participants.findIndex(p => p.userId === session.user.id);
    const nextIndex = (currentIndex + 1) % room.participants.length;
    const nextPlayer = room.participants[nextIndex];
    const newTurnNumber = room.currentTurn + 1;
    const isComplete = newTurnNumber > room.maxTurns;

    // Update database
    await prisma.$transaction([
      prisma.gameTurn.create({
        data: {
          roomId: params.roomId,
          playerId: session.user.id,
          turnNumber: room.currentTurn,
          prompt: moderation.cleanedPrompt,
          inputImageUrl: room.currentImageUrl,
          outputImageUrl: newImageUrl,
          processingTime,
        },
      }),
      prisma.gameRoom.update({
        where: { id: params.roomId },
        data: {
          currentTurn: newTurnNumber,
          currentPlayerId: isComplete ? null : nextPlayer.userId,
          currentImageUrl: newImageUrl,
          status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
          endedAt: isComplete ? new Date() : undefined,
        },
      }),
    ]);

    // Get updated state and notify
    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: {
        participants: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { turnOrder: 'asc' },
        },
        turns: {
          include: { player: { select: { id: true, name: true, image: true } } },
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    const eventType = isComplete ? PUSHER_EVENTS.GAME_COMPLETED : PUSHER_EVENTS.TURN_COMPLETED;
    await pusherServer.trigger(
      getChannelName.room(params.roomId),
      eventType,
      { gameState: updatedRoom }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit turn error:', error);
    return NextResponse.json({ error: 'Failed to submit turn' }, { status: 500 });
  }
}

// End game
export async function PATCH(
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

    if (room.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the host can end the game' },
        { status: 403 }
      );
    }

    await prisma.gameRoom.update({
      where: { id: params.roomId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        currentPlayerId: null,
      },
    });

    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: {
        participants: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { turnOrder: 'asc' },
        },
        turns: {
          include: { player: { select: { id: true, name: true, image: true } } },
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    await pusherServer.trigger(
      getChannelName.room(params.roomId),
      PUSHER_EVENTS.GAME_COMPLETED,
      { gameState: updatedRoom }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('End game error:', error);
    return NextResponse.json({ error: 'Failed to end game' }, { status: 500 });
  }
}
