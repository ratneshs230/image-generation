'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface GameHistory {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: string;
  hostId: string;
  maxTurns: number;
  participants: Array<{
    id: string;
    name: string;
    image: string | null;
  }>;
  turns: Array<{
    turnNumber: number;
    playerId: string;
    playerName: string;
    prompt: string;
    imageUrl: string;
  }>;
}

export default function GameHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const roomId = params.roomId as string;

  const [history, setHistory] = useState<GameHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTurn, setSelectedTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (session && roomId) {
      loadHistory();
    }
  }, [session, roomId]);

  useEffect(() => {
    if (!isPlaying || !history) return;

    const interval = setInterval(() => {
      setSelectedTurn(prev => {
        if (prev >= history.turns.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, history]);

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/game/${roomId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setHistory(data.gameState);
    } catch (error) {
      toast.error('Failed to load game history');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!history) return;

    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (selectedTurn >= history.turns.length - 1) {
        setSelectedTurn(0);
      }
      setIsPlaying(true);
    }
  };

  if (!session || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!history || history.turns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No history available</p>
        <Link href="/dashboard" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentTurn = history.turns[selectedTurn];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{history.roomName}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Code: {history.roomCode}</span>
            <span>{history.turns.length} turns</span>
          </div>
        </div>
        <Link href="/dashboard" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Image Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="aspect-video flex items-center justify-center bg-game-accent">
              {currentTurn && (
                <img
                  key={selectedTurn}
                  src={currentTurn.imageUrl}
                  alt={`Turn ${currentTurn.turnNumber}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm font-medium">Turn {currentTurn?.turnNumber}</span>
                <span className="text-sm text-gray-400">by {currentTurn?.playerName}</span>
              </div>
              <p className="text-gray-300">&quot;{currentTurn?.prompt}&quot;</p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="card p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedTurn(0)}
                disabled={selectedTurn === 0}
                className="btn btn-ghost p-2"
              >
                ⏮
              </button>

              <button
                onClick={() => setSelectedTurn(Math.max(0, selectedTurn - 1))}
                disabled={selectedTurn === 0}
                className="btn btn-ghost p-2"
              >
                ◀
              </button>

              <button onClick={togglePlayback} className="btn btn-primary p-2">
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                onClick={() => setSelectedTurn(Math.min(history.turns.length - 1, selectedTurn + 1))}
                disabled={selectedTurn >= history.turns.length - 1}
                className="btn btn-ghost p-2"
              >
                ▶
              </button>

              <button
                onClick={() => setSelectedTurn(history.turns.length - 1)}
                disabled={selectedTurn >= history.turns.length - 1}
                className="btn btn-ghost p-2"
              >
                ⏭
              </button>

              <div className="flex-1 mx-4">
                <input
                  type="range"
                  min="0"
                  max={history.turns.length - 1}
                  value={selectedTurn}
                  onChange={e => {
                    setIsPlaying(false);
                    setSelectedTurn(parseInt(e.target.value));
                  }}
                  className="w-full accent-game-highlight"
                />
              </div>

              <span className="text-sm text-gray-400">
                {selectedTurn + 1} / {history.turns.length}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Participants */}
          <div className="card">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Participants</h3>
            </div>
            <div className="p-2">
              {history.participants.map(participant => (
                <div key={participant.id} className="flex items-center gap-3 p-2">
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
                  <span className="font-medium text-sm">{participant.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Timeline</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {history.turns.map((turn, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsPlaying(false);
                    setSelectedTurn(index);
                  }}
                  className={`w-full text-left p-3 flex items-start gap-3 hover:bg-game-accent transition-colors ${
                    index === selectedTurn ? 'bg-game-accent' : ''
                  }`}
                >
                  <img
                    src={turn.imageUrl}
                    alt={`Turn ${turn.turnNumber}`}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{turn.turnNumber}</span>
                      <span className="text-sm font-medium">{turn.playerName}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{turn.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
