'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getLocalGame, downloadImage, LocalGame } from '@/lib/local-storage';

export default function GameHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.roomId as string;

  const [game, setGame] = useState<LocalGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTurn, setSelectedTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (gameId) {
      const localGame = getLocalGame(gameId);
      if (localGame) {
        setGame(localGame);
      } else {
        toast.error('Game not found');
        router.push('/dashboard');
      }
      setLoading(false);
    }
  }, [gameId, router]);

  useEffect(() => {
    if (!isPlaying || !game) return;

    const interval = setInterval(() => {
      setSelectedTurn(prev => {
        if (prev >= game.turns.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, game]);

  const togglePlayback = () => {
    if (!game) return;

    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (selectedTurn >= game.turns.length - 1) {
        setSelectedTurn(0);
      }
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (game && game.turns[selectedTurn]) {
      downloadImage(
        game.turns[selectedTurn].imageData,
              );
      toast.success('Image downloaded!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!game || game.turns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No history available</p>
        <Link href="/dashboard" className="btn btn-primary mt-4">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentTurn = game.turns[selectedTurn];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{game.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{game.turns.length} turns</span>
            <span className={}>
              {game.status}
            </span>
          </div>
        </div>
        <Link href="/dashboard" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="aspect-video flex items-center justify-center bg-game-accent">
              {currentTurn && (
                <img
                  key={selectedTurn}
                  src={currentTurn.imageData}
                  alt={}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">Turn {currentTurn?.turnNumber}</span>
                  <span className="text-sm text-gray-400 ml-2">by {currentTurn?.playerName}</span>
                </div>
                <button onClick={handleDownload} className="btn btn-ghost text-sm">
                  Download
                </button>
              </div>
              <p className="text-gray-300">&quot;{currentTurn?.prompt}&quot;</p>
            </div>
          </div>

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
                onClick={() => setSelectedTurn(Math.min(game.turns.length - 1, selectedTurn + 1))}
                disabled={selectedTurn >= game.turns.length - 1}
                className="btn btn-ghost p-2"
              >
                ▶
              </button>
              <button
                onClick={() => setSelectedTurn(game.turns.length - 1)}
                disabled={selectedTurn >= game.turns.length - 1}
                className="btn btn-ghost p-2"
              >
                ⏭
              </button>
              <div className="flex-1 mx-4">
                <input
                  type="range"
                  min="0"
                  max={game.turns.length - 1}
                  value={selectedTurn}
                  onChange={e => {
                    setIsPlaying(false);
                    setSelectedTurn(parseInt(e.target.value));
                  }}
                  className="w-full accent-game-highlight"
                />
              </div>
              <span className="text-sm text-gray-400">
                {selectedTurn + 1} / {game.turns.length}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Timeline</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {game.turns.map((turn, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsPlaying(false);
                    setSelectedTurn(index);
                  }}
                  className={}
                >
                  <img
                    src={turn.imageData}
                    alt={}
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
