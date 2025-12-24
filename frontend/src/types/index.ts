// User types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: string;
}

export interface UserStatistics {
  gamesPlayed: number;
  gamesHosted: number;
  gamesWon: number;
  totalTurns: number;
}

// Room types
export interface Room {
  id: string;
  code: string;
  name: string;
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  maxTurns: number;
  currentTurn: number;
  currentPlayerId: string | null;
  currentImageUrl: string | null;
  host: Participant;
  participants: Participant[];
  createdAt?: string;
}

export type RoomStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Participant {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  turnOrder: number;
  isActive?: boolean;
}

// Game types
export interface GameState {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: RoomStatus;
  hostId: string;
  currentTurn: number;
  maxTurns: number;
  currentPlayerId: string | null;
  currentImageUrl: string | null;
  participants: Participant[];
  turns: Turn[];
}

export interface Turn {
  turnNumber: number;
  playerId: string;
  playerName: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}

export interface GameHistory {
  room: {
    id: string;
    code: string;
    name: string;
    status: RoomStatus;
    createdAt: string;
    endedAt: string | null;
    maxTurns: number;
    totalTurns: number;
  };
  host: Participant;
  participants: Array<Participant & { joinedAt: string }>;
  turns: Array<{
    turnNumber: number;
    player: Participant;
    prompt: string;
    imageUrl: string;
    processingTime: number | null;
    createdAt: string;
  }>;
}

// Chat types
export interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
