import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;

    if (!socketId || !channel) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // For presence channels, include user data
    if (channel.startsWith('presence-')) {
      const presenceData = {
        user_id: session.user.id,
        user_info: {
          name: session.user.name,
          image: session.user.image,
        },
      };

      const authResponse = pusherServer.authorizeChannel(
        socketId,
        channel,
        presenceData
      );

      return NextResponse.json(authResponse);
    }

    // For private channels
    if (channel.startsWith('private-')) {
      const authResponse = pusherServer.authorizeChannel(socketId, channel);
      return NextResponse.json(authResponse);
    }

    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Authorization failed' }, { status: 500 });
  }
}
