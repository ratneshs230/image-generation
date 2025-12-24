'use client';

import { v4 as uuidv4 } from 'uuid';

// User identity (stored in localStorage)
export interface LocalUser {
  id: string;
  name: string;
  createdAt: string;
}

// Game turn data
export interface LocalTurn {
  turnNumber: number;
  playerId: string;
  playerName: string;
  prompt: string;
  imageData: string; // Base64 image data
  createdAt: string;
}

// Local game data
export interface LocalGame {
  id: string;
  name: string;
  status: 'active' | 'completed';
  turns: LocalTurn[];
  createdAt: string;
  updatedAt: string;
}

const USER_KEY = 'image-game-user';
const GAMES_KEY = 'image-game-history';

// Get or create local user
export function getLocalUser(): LocalUser {
  if (typeof window === 'undefined') {
    return { id: '', name: 'Guest', createdAt: new Date().toISOString() };
  }

  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const user: LocalUser = {
    id: uuidv4(),
    name: `Player-${randomSuffix}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

// Update user name
export function updateUserName(name: string): LocalUser {
  const user = getLocalUser();
  user.name = name;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

// Get all local games
export function getLocalGames(): LocalGame[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(GAMES_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Save a game
export function saveLocalGame(game: LocalGame): void {
  const games = getLocalGames();
  const existingIndex = games.findIndex(g => g.id === game.id);

  if (existingIndex >= 0) {
    games[existingIndex] = game;
  } else {
    games.unshift(game);
  }

  // Keep only last 50 games
  const trimmed = games.slice(0, 50);
  localStorage.setItem(GAMES_KEY, JSON.stringify(trimmed));
}

// Get a specific game
export function getLocalGame(id: string): LocalGame | null {
  const games = getLocalGames();
  return games.find(g => g.id === id) || null;
}

// Delete a game
export function deleteLocalGame(id: string): void {
  const games = getLocalGames().filter(g => g.id !== id);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

// Create a new game
export function createLocalGame(name: string): LocalGame {
  const game: LocalGame = {
    id: uuidv4(),
    name,
    status: 'active',
    turns: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveLocalGame(game);
  return game;
}

// Add turn to a game
export function addTurnToGame(gameId: string, turn: Omit<LocalTurn, 'turnNumber' | 'createdAt'>): LocalGame | null {
  const game = getLocalGame(gameId);
  if (!game) return null;

  const newTurn: LocalTurn = {
    ...turn,
    turnNumber: game.turns.length + 1,
    createdAt: new Date().toISOString(),
  };

  game.turns.push(newTurn);
  game.updatedAt = new Date().toISOString();
  saveLocalGame(game);
  return game;
}

// Complete a game
export function completeLocalGame(id: string): LocalGame | null {
  const game = getLocalGame(id);
  if (!game) return null;

  game.status = 'completed';
  game.updatedAt = new Date().toISOString();
  saveLocalGame(game);
  return game;
}

// Download image as file
export function downloadImage(imageData: string, filename: string): void {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export game as JSON
export function exportGame(game: LocalGame): void {
  const dataStr = JSON.stringify(game, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${game.name.replace(/\s+/g, '-')}-${game.id.substring(0, 8)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
