import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      }
    );
  }
  return pusherClientInstance;
};

// Channel names
export const getChannelName = {
  room: (roomId: string) => `presence-room-${roomId}`,
  privateRoom: (roomId: string) => `private-room-${roomId}`,
};

// Event names
export const PUSHER_EVENTS = {
  // Game events
  GAME_STARTED: 'game:started',
  TURN_COMPLETED: 'game:turnCompleted',
  GAME_COMPLETED: 'game:completed',
  TURN_PROCESSING: 'turn:processing',
  TURN_ERROR: 'turn:error',

  // Room events
  PLAYER_JOINED: 'room:playerJoined',
  PLAYER_LEFT: 'room:playerLeft',
  ROOM_UPDATED: 'room:updated',

  // Chat events
  CHAT_MESSAGE: 'room:chatMessage',
  USER_TYPING: 'room:userTyping',
};
