'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  getLocalGames,
  deleteLocalGame,
  exportGame,
  LocalGame,
} from '@/lib/local-storage';

export default function DashboardPage() {
  const [games, setGames] = useState<LocalGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = () => {
    const localGames = getLocalGames();
    setGames(localGames);
    setLoading(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm()) {
      deleteLocalGame(id);
      loadGames();
      toast.success('Game deleted');
    }
  };

  const handleExport = (game: LocalGame) => {
    exportGame(game);
    toast.success('Game exported!');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Games</h1>
        <Link href="/play" className="btn btn-primary">
          New Game
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-3xl font-bold text-game-highlight">
            {games.length}
          </div>
          <div className="text-gray-400 text-sm">Total Games</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-green-400">
            {games.filter(g => g.status === 'active').length}
          </div>
          <div className="text-gray-400 text-sm">Active</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-purple-400">
            {games.filter(g => g.status === 'completed').length}
          </div>
          <div className="text-gray-400 text-sm">Completed</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-blue-400">
            {games.reduce((acc, g) => acc + g.turns.length, 0)}
          </div>
          <div className="text-gray-400 text-sm">Total Turns</div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold">Game History</h2>
        </div>

        {games.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No games yet. Start creating!</p>
            <Link href="/play" className="btn btn-primary">
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {games.map(game => (
              <div
                key={game.id}
                className="flex items-center justify-between p-4 hover:bg-game-accent transition-colors"
              >
                <Link
                  href={}
                  className="flex items-center gap-4 flex-1"
                >
                  <div className="w-16 h-16 rounded bg-game-accent flex items-center justify-center overflow-hidden">
                    {game.turns.length > 0 ? (
                      <img
                        src={game.turns[game.turns.length - 1].imageData}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🎨</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{game.name}</span>
                      <span className={}>
                        {game.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {game.turns.length} turns - {formatDate(game.updatedAt)}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport(game)}
                    className="btn btn-ghost text-sm"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => handleDelete(game.id, game.name)}
                    className="btn btn-ghost text-red-400 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-center text-gray-500 text-sm mt-4">
        All games are stored locally on this device
      </p>
    </div>
  );
}
