'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { getPusherClient, getChannelName, PUSHER_EVENTS } from '@/lib/pusher';

interface GameState {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: string;
  hostId: string;
  currentTurn: number;
  maxTurns: number;
  currentPlayerId: string | null;
  currentImageUrl: string | null;
  participants: Array<{
    id: string;
    name: string;
    image: string | null;
    turnOrder: number;
  }>;
  turns: Array<{
    turnNumber: number;
    playerId: string;
    playerName: string;
    prompt: string;
    imageUrl: string;
    createdAt: string;
  }>;
}

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const roomId = params.roomId as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [initialImage, setInitialImage] = useState<File | null>(null);
  const [startingGame, setStartingGame] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load game state
  useEffect(() => {
    if (session && roomId) {
      loadGameState();
    }
  }, [session, roomId]);

  // Setup Pusher
  useEffect(() => {
    if (!session || !roomId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getChannelName.room(roomId));

    channel.bind(PUSHER_EVENTS.GAME_STARTED, ({ gameState }: { gameState: any }) => {
      setGameState(formatGameState(gameState));
      setProcessing(false);
      toast.success('Game started!');
    });

    channel.bind(PUSHER_EVENTS.TURN_COMPLETED, ({ gameState }: { gameState: any }) => {
      setGameState(formatGameState(gameState));
      setProcessing(false);
      toast.success('Turn completed!');
    });

    channel.bind(PUSHER_EVENTS.GAME_COMPLETED, ({ gameState }: { gameState: any }) => {
      setGameState(formatGameState(gameState));
      setProcessing(false);
      toast.success('Game completed!');
    });

    channel.bind(PUSHER_EVENTS.TURN_PROCESSING, () => {
      setProcessing(true);
    });

    channel.bind(PUSHER_EVENTS.PLAYER_JOINED, () => {
      loadGameState();
      toast.success('A player joined!');
    });

    channel.bind(PUSHER_EVENTS.PLAYER_LEFT, ({ name }: { name: string }) => {
      loadGameState();
      toast(`${name} left the room`);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getChannelName.room(roomId));
    };
  }, [session, roomId]);

  const formatGameState = (room: any): GameState => ({
    roomId: room.id,
    roomCode: room.code,
    roomName: room.name,
    status: room.status,
    hostId: room.hostId,
    currentTurn: room.currentTurn,
    maxTurns: room.maxTurns,
    currentPlayerId: room.currentPlayerId,
    currentImageUrl: room.currentImageUrl,
    participants: room.participants.map((p: any) => ({
      id: p.user.id,
      name: p.user.name,
      image: p.user.image,
      turnOrder: p.turnOrder,
    })),
    turns: room.turns.map((t: any) => ({
      turnNumber: t.turnNumber,
      playerId: t.playerId,
      playerName: t.player.name,
      prompt: t.prompt,
      imageUrl: t.outputImageUrl,
      createdAt: t.createdAt,
    })),
  });

  const loadGameState = async () => {
    try {
      const res = await fetch(`/api/game/${roomId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setGameState(data.gameState);
    } catch (error) {
      toast.error('Failed to load game');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!initialPrompt.trim() && !initialImage) {
      toast.error('Provide an initial prompt or upload an image');
      return;
    }

    setStartingGame(true);

    try {
      const formData = new FormData();
      if (initialPrompt.trim()) {
        formData.append('prompt', initialPrompt.trim());
      }
      if (initialImage) {
        formData.append('initialImage', initialImage);
      }

      const res = await fetch(`/api/game/${roomId}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setStartingGame(false);
    }
  };

  const handleSubmitTurn = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt');
      return;
    }

    setSubmitting(true);
    setProcessing(true);

    try {
      const res = await fetch(`/api/game/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setPrompt('');
    } catch (error: any) {
      toast.error(error.message);
      setProcessing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndGame = async () => {
    if (!confirm('Are you sure you want to end the game?')) return;

    try {
      const res = await fetch(`/api/game/${roomId}`, { method: 'PATCH' });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!session || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Game not found</p>
      </div>
    );
  }

  const isHost = gameState.hostId === session.user?.id;
  const isMyTurn = gameState.currentPlayerId === session.user?.id;
  const currentPlayer = gameState.participants.find(p => p.id === gameState.currentPlayerId);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Game Area */}
      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{gameState.roomName}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Code: {gameState.roomCode}</span>
              <span>Turn {gameState.currentTurn} / {gameState.maxTurns}</span>
              <span className={`px-2 py-0.5 rounded ${
                gameState.status === 'WAITING' ? 'bg-yellow-500/20 text-yellow-400' :
                gameState.status === 'IN_PROGRESS' ? 'bg-green-500/20 text-green-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {gameState.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {isHost && gameState.status === 'IN_PROGRESS' && (
            <button onClick={handleEndGame} className="btn btn-ghost text-red-400">
              End Game
            </button>
          )}
        </div>

        {/* Game Content */}
        {gameState.status === 'WAITING' ? (
          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Waiting for Game to Start
            </h2>

            {isHost ? (
              <div className="max-w-md mx-auto space-y-4">
                <p className="text-gray-400 text-center mb-4">
                  Upload an image or enter a prompt to start:
                </p>

                <div>
                  <label className="block text-sm font-medium mb-2">Initial Prompt</label>
                  <textarea
                    value={initialPrompt}
                    onChange={e => setInitialPrompt(e.target.value)}
                    placeholder="Describe the starting image..."
                    className="input h-24 resize-none"
                  />
                </div>

                <div className="text-center text-gray-500">or</div>

                <div>
                  <label className="block text-sm font-medium mb-2">Upload Image</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={e => setInitialImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary w-full"
                  >
                    {initialImage ? initialImage.name : 'Choose Image'}
                  </button>
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={startingGame || (!initialPrompt.trim() && !initialImage)}
                  className="btn btn-primary w-full py-3 mt-4"
                >
                  {startingGame ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="spinner w-4 h-4" />
                      Starting...
                    </span>
                  ) : (
                    'Start Game'
                  )}
                </button>
              </div>
            ) : (
              <p className="text-center text-gray-400">
                Waiting for the host to start the game...
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Image */}
            <div className="card overflow-hidden">
              <div className="aspect-square md:aspect-video flex items-center justify-center bg-game-accent relative">
                {processing ? (
                  <div className="text-center">
                    <div className="spinner w-12 h-12 mx-auto mb-4" />
                    <p className="text-gray-400">Generating image...</p>
                  </div>
                ) : gameState.currentImageUrl ? (
                  <img
                    src={gameState.currentImageUrl}
                    alt="Current game image"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-gray-500">No image yet</p>
                )}
              </div>
            </div>

            {/* Turn Input */}
            {gameState.status === 'IN_PROGRESS' && currentPlayer && (
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`relative ${isMyTurn ? 'turn-indicator' : ''}`}>
                    {currentPlayer.image ? (
                      <Image
                        src={currentPlayer.image}
                        alt={currentPlayer.name || ''}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-game-highlight flex items-center justify-center font-medium">
                        {currentPlayer.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {isMyTurn ? "It's your turn!" : `${currentPlayer.name}'s turn`}
                    </p>
                    <p className="text-sm text-gray-400">Waiting for prompt...</p>
                  </div>
                </div>

                {isMyTurn && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="Enter your prompt..."
                      className="input flex-1"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitTurn();
                        }
                      }}
                      disabled={submitting || processing}
                    />
                    <button
                      onClick={handleSubmitTurn}
                      disabled={submitting || processing || !prompt.trim()}
                      className="btn btn-primary"
                    >
                      {submitting ? <div className="spinner w-5 h-5" /> : 'Submit'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed */}
            {gameState.status === 'COMPLETED' && (
              <div className="card p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
                <p className="text-gray-400 mb-4">
                  The image evolved through {gameState.turns.length} turns
                </p>
                <button
                  onClick={() => router.push(`/history/${roomId}`)}
                  className="btn btn-primary"
                >
                  View Full History
                </button>
              </div>
            )}

            {/* Turn History */}
            {gameState.turns.length > 0 && (
              <div className="card">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="font-semibold">Turn History</h3>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-800">
                  {gameState.turns.map((turn, index) => (
                    <div key={index} className="p-3 flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-8">#{turn.turnNumber}</span>
                      <span className="font-medium text-sm">{turn.playerName}</span>
                      <span className="text-gray-400 text-sm truncate flex-1">{turn.prompt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar - Players */}
      <div className="lg:w-80">
        <div className="card">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold">Players ({gameState.participants.length})</h3>
          </div>
          <div className="p-2">
            {gameState.participants.map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  participant.id === gameState.currentPlayerId ? 'bg-game-highlight/20' : ''
                }`}
              >
                {participant.image ? (
                  <Image
                    src={participant.image}
                    alt={participant.name || ''}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-game-accent flex items-center justify-center text-sm">
                    {participant.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{participant.name}</span>
                    {participant.id === gameState.hostId && (
                      <span className="text-xs bg-game-highlight/20 text-game-highlight px-1.5 rounded">
                        Host
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Turn #{index + 1}</p>
                </div>

                {participant.id === gameState.currentPlayerId && (
                  <span className="text-xs text-game-highlight">Current</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
