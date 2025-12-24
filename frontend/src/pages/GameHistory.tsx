import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gameApi } from '../services/api';
import { GameHistory as GameHistoryType } from '../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameHistory() {
  const { roomId } = useParams<{ roomId: string }>();
  const [history, setHistory] = useState<GameHistoryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTurn, setSelectedTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [roomId]);

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
      const response = await gameApi.getHistory(roomId!);
      setHistory(response.data.history);
    } catch (error: any) {
      toast.error('Failed to load game history');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Game history not found</p>
        <Link to="/dashboard" className="btn btn-primary mt-4">
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
          <h1 className="text-2xl font-bold">{history.room.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Code: {history.room.code}</span>
            <span>{history.turns.length} turns</span>
            <span>
              {new Date(history.room.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Image Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="image-container aspect-video flex items-center justify-center bg-game-accent">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedTurn}
                  src={currentTurn?.imageUrl}
                  alt={`Turn ${currentTurn?.turnNumber}`}
                  className="max-w-full max-h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>
            </div>

            {/* Image Info */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm font-medium">
                  Turn {currentTurn?.turnNumber}
                </span>
                <span className="text-sm text-gray-400">
                  by {currentTurn?.player.displayName || currentTurn?.player.username}
                </span>
              </div>
              <p className="text-gray-300">"{currentTurn?.prompt}"</p>
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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={() => setSelectedTurn(Math.max(0, selectedTurn - 1))}
                disabled={selectedTurn === 0}
                className="btn btn-ghost p-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={togglePlayback}
                className="btn btn-primary p-2"
              >
                {isPlaying ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </button>

              <button
                onClick={() =>
                  setSelectedTurn(Math.min(history.turns.length - 1, selectedTurn + 1))
                }
                disabled={selectedTurn >= history.turns.length - 1}
                className="btn btn-ghost p-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <button
                onClick={() => setSelectedTurn(history.turns.length - 1)}
                disabled={selectedTurn >= history.turns.length - 1}
                className="btn btn-ghost p-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
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
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2"
                >
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-game-accent flex items-center justify-center text-sm">
                      {participant.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-sm">
                      {participant.displayName || participant.username}
                    </span>
                    {participant.id === history.host.id && (
                      <span className="ml-2 text-xs bg-game-highlight/20 text-game-highlight px-1.5 rounded">
                        Host
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Turn Timeline */}
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
                      <span className="text-xs text-gray-500">
                        #{turn.turnNumber}
                      </span>
                      <span className="text-sm font-medium">
                        {turn.player.displayName || turn.player.username}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {turn.prompt}
                    </p>
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
