'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  getLocalUser,
  createLocalGame,
  addTurnToGame,
  completeLocalGame,
  downloadImage,
  LocalGame,
  LocalTurn,
} from '@/lib/local-storage';

export default function PlayPage() {
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const [game, setGame] = useState<LocalGame | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = getLocalUser();

  const handleStartGame = () => {
    if (!gameName.trim()) {
      toast.error('Please enter a game name');
      return;
    }
    const newGame = createLocalGame(gameName.trim());
    setGame(newGame);
    toast.success('Game started!');
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setCurrentImage(imageData);
      toast.success('Image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!game) {
      toast.error('Please start a game first');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          currentImage: currentImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Add turn to game
      const updatedGame = addTurnToGame(game.id, {
        playerId: user.id,
        playerName: user.name,
        prompt: prompt.trim(),
        imageData: data.imageData,
      });

      if (updatedGame) {
        setGame(updatedGame);
        setCurrentImage(data.imageData);
        setPrompt('');
        toast.success('Image generated!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (currentImage) {
      const turnNum = game?.turns.length || 0;
      downloadImage(currentImage, `evolution-${turnNum}.png`);
      toast.success('Image downloaded!');
    }
  };

  const handleEndGame = () => {
    if (game) {
      completeLocalGame(game.id);
      toast.success('Game completed!');
      router.push('/dashboard');
    }
  };

  if (!game) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-8">New Game</h1>

        <div className="card p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Game Name</label>
            <input
              type="text"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              placeholder="Enter a name for your game"
              className="input"
              maxLength={50}
            />
          </div>

          <button
            onClick={handleStartGame}
            disabled={!gameName.trim()}
            className="btn btn-primary w-full py-3"
          >
            Start Game
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          Your game history is saved locally on this device
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{game.name}</h1>
          <p className="text-gray-400 text-sm">
            Turn {game.turns.length} - Playing as {user.name}
          </p>
        </div>
        <button onClick={handleEndGame} className="btn btn-ghost text-red-400">
          End Game
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Display */}
        <div className="card overflow-hidden">
          <div className="aspect-square flex items-center justify-center bg-game-accent relative">
            {loading ? (
              <div className="text-center">
                <div className="spinner w-12 h-12 mx-auto mb-4" />
                <p className="text-gray-400">Generating...</p>
              </div>
            ) : currentImage ? (
              <img
                src={currentImage}
                alt="Current game image"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center p-8">
                <p className="text-gray-500 mb-4">No image yet</p>
                <p className="text-gray-600 text-sm">
                  Upload an image or enter a prompt to start
                </p>
              </div>
            )}
          </div>

          {currentImage && (
            <div className="p-3 border-t border-gray-800 flex justify-end">
              <button onClick={handleDownload} className="btn btn-ghost text-sm">
                Download Image
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Upload Image */}
          <div className="card p-4">
            <label className="block text-sm font-medium mb-2">
              Upload Starting Image (Optional)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary w-full"
            >
              Choose Image
            </button>
          </div>

          {/* Prompt Input */}
          <div className="card p-4">
            <label className="block text-sm font-medium mb-2">
              Enter Your Prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what you want to create or how to modify the image..."
              className="input h-32 resize-none mb-3"
              disabled={loading}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="btn btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4" />
                  Generating...
                </span>
              ) : (
                'Generate Image'
              )}
            </button>
          </div>

          {/* Turn History */}
          {game.turns.length > 0 && (
            <div className="card">
              <div className="p-3 border-b border-gray-800">
                <h3 className="font-semibold text-sm">Turn History</h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {game.turns.map((turn, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(turn.imageData)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-game-accent transition-colors border-b border-gray-800 last:border-0"
                  >
                    <span className="text-xs text-gray-500 w-6">#{turn.turnNumber}</span>
                    <span className="text-sm truncate flex-1">{turn.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
