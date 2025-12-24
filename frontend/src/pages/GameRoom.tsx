import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { gameApi, roomApi } from '../services/api';
import { GameState, ChatMessage, Participant } from '../types';
import toast from 'react-hot-toast';

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { socket, joinRoom, leaveRoom, sendChat } = useSocket();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [initialImage, setInitialImage] = useState<File | null>(null);
  const [startingGame, setStartingGame] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (roomId) {
      loadGameState();
      joinRoom(roomId);
    }

    return () => {
      if (roomId) {
        leaveRoom(roomId);
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    // Game events
    socket.on('game:started', ({ gameState }) => {
      setGameState(gameState);
      setProcessing(false);
      toast.success('Game started!');
    });

    socket.on('game:turnCompleted', ({ gameState }) => {
      setGameState(gameState);
      setProcessing(false);
      toast.success('Turn completed!');
    });

    socket.on('game:completed', ({ gameState }) => {
      setGameState(gameState);
      setProcessing(false);
      toast.success('Game completed!');
    });

    socket.on('turn:processing', ({ prompt }) => {
      setProcessing(true);
    });

    socket.on('turn:error', ({ error }) => {
      setProcessing(false);
      toast.error(error);
    });

    // Room events
    socket.on('room:playerJoined', ({ user }) => {
      toast.success(`${user.username} joined the room`);
      loadGameState();
    });

    socket.on('room:playerLeft', ({ username }) => {
      toast(`${username} left the room`, { icon: '👋' });
      loadGameState();
    });

    socket.on('room:userConnected', ({ userId, onlineCount }) => {
      setOnlineUsers(prev => [...prev, userId]);
    });

    socket.on('room:userDisconnected', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socket.on('room:joined', ({ onlineUsers }) => {
      setOnlineUsers(onlineUsers);
    });

    // Chat events
    socket.on('room:chatMessage', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('game:started');
      socket.off('game:turnCompleted');
      socket.off('game:completed');
      socket.off('turn:processing');
      socket.off('turn:error');
      socket.off('room:playerJoined');
      socket.off('room:playerLeft');
      socket.off('room:userConnected');
      socket.off('room:userDisconnected');
      socket.off('room:joined');
      socket.off('room:chatMessage');
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadGameState = async () => {
    try {
      const response = await gameApi.getState(roomId!);
      setGameState(response.data.gameState);
    } catch (error: any) {
      toast.error('Failed to load game state');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!initialPrompt.trim() && !initialImage) {
      toast.error('Please provide an initial prompt or upload an image');
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

      await gameApi.start(roomId!, formData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start game');
    } finally {
      setStartingGame(false);
    }
  };

  const handleSubmitTurn = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setSubmitting(true);
    setProcessing(true);

    try {
      await gameApi.submitTurn(roomId!, prompt.trim());
      setPrompt('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit turn');
      setProcessing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndGame = async () => {
    if (!confirm('Are you sure you want to end the game?')) return;

    try {
      await gameApi.endGame(roomId!);
    } catch (error: any) {
      toast.error(error.message || 'Failed to end game');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId) return;

    sendChat(roomId, chatInput.trim());
    setChatInput('');
  };

  const handleLeaveRoom = async () => {
    if (!confirm('Are you sure you want to leave?')) return;

    try {
      await roomApi.leave(roomId!);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave room');
    }
  };

  const isHost = gameState?.hostId === user?.id;
  const isMyTurn = gameState?.currentPlayerId === user?.id;
  const currentPlayer = gameState?.participants.find(
    p => p.id === gameState.currentPlayerId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8"></div>
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
              <span>
                Turn {gameState.currentTurn} / {gameState.maxTurns}
              </span>
              <span
                className={`px-2 py-0.5 rounded ${
                  gameState.status === 'WAITING'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : gameState.status === 'IN_PROGRESS'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {gameState.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {isHost && gameState.status === 'IN_PROGRESS' && (
              <button onClick={handleEndGame} className="btn btn-ghost text-red-400">
                End Game
              </button>
            )}
            {!isHost && (
              <button onClick={handleLeaveRoom} className="btn btn-ghost">
                Leave
              </button>
            )}
          </div>
        </div>

        {/* Game Content */}
        {gameState.status === 'WAITING' ? (
          // Waiting Room
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
                  <label className="block text-sm font-medium mb-2">
                    Initial Prompt
                  </label>
                  <textarea
                    value={initialPrompt}
                    onChange={e => setInitialPrompt(e.target.value)}
                    placeholder="Describe the starting image..."
                    className="input h-24 resize-none"
                  />
                </div>

                <div className="text-center text-gray-500">or</div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload Image
                  </label>
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
                      <div className="spinner w-4 h-4"></div>
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
          // Active Game
          <div className="space-y-6">
            {/* Current Image */}
            <div className="card overflow-hidden">
              <div className="image-container aspect-square md:aspect-video flex items-center justify-center">
                {processing ? (
                  <div className="text-center">
                    <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                    <p className="text-gray-400">Generating image...</p>
                  </div>
                ) : gameState.currentImageUrl ? (
                  <img
                    src={gameState.currentImageUrl}
                    alt="Current game image"
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <p className="text-gray-500">No image yet</p>
                )}
              </div>
            </div>

            {/* Turn Info */}
            {gameState.status === 'IN_PROGRESS' && currentPlayer && (
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`relative ${
                        isMyTurn ? 'turn-indicator' : ''
                      }`}
                    >
                      {currentPlayer.avatarUrl ? (
                        <img
                          src={currentPlayer.avatarUrl}
                          alt={currentPlayer.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-game-highlight flex items-center justify-center font-medium">
                          {currentPlayer.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {isMyTurn
                          ? "It's your turn!"
                          : `${currentPlayer.displayName || currentPlayer.username}'s turn`}
                      </p>
                      <p className="text-sm text-gray-400">
                        Waiting for prompt...
                      </p>
                    </div>
                  </div>
                </div>

                {isMyTurn && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="Enter your prompt to edit the image..."
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
                      {submitting ? (
                        <div className="spinner w-5 h-5"></div>
                      ) : (
                        'Submit'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed State */}
            {gameState.status === 'COMPLETED' && (
              <div className="card p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
                <p className="text-gray-400 mb-4">
                  The image evolved through {gameState.turns.length} turns
                </p>
                <button
                  onClick={() => navigate(`/history/${roomId}`)}
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
                      <span className="text-xs text-gray-500 w-8">
                        #{turn.turnNumber}
                      </span>
                      <span className="font-medium text-sm">
                        {turn.playerName}
                      </span>
                      <span className="text-gray-400 text-sm truncate flex-1">
                        {turn.prompt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="lg:w-80 space-y-4">
        {/* Players */}
        <div className="card">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold">
              Players ({gameState.participants.length})
            </h3>
          </div>
          <div className="p-2">
            {gameState.participants.map((participant, index) => (
              <PlayerItem
                key={participant.id}
                participant={participant}
                isHost={participant.id === gameState.hostId}
                isCurrentTurn={participant.id === gameState.currentPlayerId}
                isOnline={onlineUsers.includes(participant.id)}
                turnOrder={index + 1}
              />
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="card">
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full p-4 flex items-center justify-between border-b border-gray-800"
          >
            <h3 className="font-semibold">Chat</h3>
            <span className="text-gray-400">
              {showChat ? '▲' : '▼'}
            </span>
          </button>

          {showChat && (
            <>
              <div className="h-48 overflow-y-auto p-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center">
                    No messages yet
                  </p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`text-sm ${
                        msg.userId === user?.id
                          ? 'text-primary-400'
                          : 'text-gray-300'
                      }`}
                    >
                      <span className="font-medium">{msg.username}: </span>
                      <span>{msg.message}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleSendChat}
                className="p-2 border-t border-gray-800"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="input text-sm py-1"
                  />
                  <button type="submit" className="btn btn-primary py-1 px-3">
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerItem({
  participant,
  isHost,
  isCurrentTurn,
  isOnline,
  turnOrder,
}: {
  participant: Participant;
  isHost: boolean;
  isCurrentTurn: boolean;
  isOnline: boolean;
  turnOrder: number;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg ${
        isCurrentTurn ? 'bg-game-highlight/20' : ''
      }`}
    >
      <div className="relative">
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
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-game-card ${
            isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {participant.displayName || participant.username}
          </span>
          {isHost && (
            <span className="text-xs bg-game-highlight/20 text-game-highlight px-1.5 rounded">
              Host
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Turn #{turnOrder}</p>
      </div>

      {isCurrentTurn && (
        <span className="text-xs text-game-highlight">Current</span>
      )}
    </div>
  );
}
