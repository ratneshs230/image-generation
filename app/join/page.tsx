'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { isValidRoomCode } from '@/lib/utils';

export default function JoinRoomPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);

  if (!session) {
    router.push('/login');
    return null;
  }

  const handleCodeChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(formatted);
    setRoomInfo(null);
  };

  const handleLookup = async () => {
    if (!isValidRoomCode(code)) {
      toast.error('Room code must be 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/rooms/code/${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Room not found');
      }

      setRoomInfo(data.room);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomInfo) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/rooms/${roomInfo.id}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      toast.success('Joined room!');
      router.push(`/room/${roomInfo.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">Join a Room</h1>

      <div className="card p-6 space-y-6">
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
              {loading ? <div className="spinner w-5 h-5" /> : 'Find'}
            </button>
          </div>
        </div>

        {roomInfo && (
          <div className="border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{roomInfo.name}</h3>
              <span className={`${
                roomInfo.status === 'WAITING' ? 'text-yellow-400' :
                roomInfo.status === 'IN_PROGRESS' ? 'text-green-400' :
                'text-blue-400'
              }`}>
                {roomInfo.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-4">
              <div>
                <span className="block text-gray-500">Host</span>
                {roomInfo.host.name}
              </div>
              <div>
                <span className="block text-gray-500">Players</span>
                {roomInfo.participantCount} / {roomInfo.maxPlayers}
              </div>
            </div>

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
