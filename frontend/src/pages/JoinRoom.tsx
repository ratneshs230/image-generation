import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomApi } from '../services/api';
import toast from 'react-hot-toast';

export default function JoinRoom() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const navigate = useNavigate();

  const handleCodeChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(formatted);
    setRoomInfo(null);
  };

  const handleLookup = async () => {
    if (code.length !== 6) {
      toast.error('Room code must be 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await roomApi.getByCode(code);
      setRoomInfo(response.data.room);
    } catch (error: any) {
      toast.error(error.message || 'Room not found');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomInfo) return;

    setLoading(true);

    try {
      await roomApi.join(roomInfo.id);
      toast.success('Joined room successfully!');
      navigate(`/room/${roomInfo.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'WAITING':
        return { text: 'Waiting for players', color: 'text-yellow-400' };
      case 'IN_PROGRESS':
        return { text: 'Game in progress', color: 'text-green-400' };
      case 'COMPLETED':
        return { text: 'Game completed', color: 'text-blue-400' };
      default:
        return { text: status, color: 'text-gray-400' };
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">Join a Room</h1>

      <div className="card p-6 space-y-6">
        {/* Room Code Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Room Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => handleCodeChange(e.target.value)}
              placeholder="Enter 6-character code"
              className="input flex-1 text-center text-2xl tracking-widest font-mono"
              maxLength={6}
            />
            <button
              onClick={handleLookup}
              disabled={loading || code.length !== 6}
              className="btn btn-secondary"
            >
              {loading ? (
                <div className="spinner w-5 h-5"></div>
              ) : (
                'Find'
              )}
            </button>
          </div>
        </div>

        {/* Room Info */}
        {roomInfo && (
          <div className="border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{roomInfo.name}</h3>
              <span className={getStatusMessage(roomInfo.status).color}>
                {getStatusMessage(roomInfo.status).text}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-4">
              <div>
                <span className="block text-gray-500">Host</span>
                {roomInfo.host.displayName || roomInfo.host.username}
              </div>
              <div>
                <span className="block text-gray-500">Players</span>
                {roomInfo.participantCount} / {roomInfo.maxPlayers}
              </div>
              <div>
                <span className="block text-gray-500">Turns</span>
                {roomInfo.currentTurn} / {roomInfo.maxTurns}
              </div>
            </div>

            {/* Participants */}
            {roomInfo.participants?.length > 0 && (
              <div className="mb-4">
                <span className="text-sm text-gray-500 block mb-2">
                  Current Players:
                </span>
                <div className="flex flex-wrap gap-2">
                  {roomInfo.participants.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-game-accent px-3 py-1 rounded-full text-sm"
                    >
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.username}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-game-highlight flex items-center justify-center text-xs">
                          {p.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {p.displayName || p.username}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={
                loading ||
                roomInfo.status !== 'WAITING' ||
                roomInfo.participantCount >= roomInfo.maxPlayers
              }
              className="btn btn-primary w-full"
            >
              {roomInfo.status !== 'WAITING'
                ? 'Game Already Started'
                : roomInfo.participantCount >= roomInfo.maxPlayers
                ? 'Room is Full'
                : loading
                ? 'Joining...'
                : 'Join Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
