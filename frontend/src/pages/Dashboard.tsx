import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomApi, userApi } from '../services/api';
import { UserStatistics } from '../types';
import toast from 'react-hot-toast';

interface RoomSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  isHost: boolean;
  participantCount: number;
  host: { username: string };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roomsRes, statsRes] = await Promise.all([
        roomApi.getMyRooms(),
        userApi.getStats(),
      ]);

      setRooms(roomsRes.data.rooms);
      setStats(statsRes.data.statistics);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'IN_PROGRESS':
        return 'bg-green-500/20 text-green-400';
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/create" className="btn btn-primary">
            Create Room
          </Link>
          <Link to="/join" className="btn btn-secondary">
            Join Room
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-3xl font-bold text-game-highlight">
            {stats?.gamesPlayed || 0}
          </div>
          <div className="text-gray-400 text-sm">Games Played</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-primary-400">
            {stats?.gamesHosted || 0}
          </div>
          <div className="text-gray-400 text-sm">Games Hosted</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-green-400">
            {stats?.totalTurns || 0}
          </div>
          <div className="text-gray-400 text-sm">Total Turns</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-purple-400">
            {rooms.filter(r => r.status === 'IN_PROGRESS').length}
          </div>
          <div className="text-gray-400 text-sm">Active Games</div>
        </div>
      </div>

      {/* My Rooms */}
      <div className="card">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold">My Rooms</h2>
        </div>

        {rooms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">You haven't joined any rooms yet.</p>
            <Link to="/create" className="btn btn-primary">
              Create Your First Room
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {rooms.map(room => (
              <Link
                key={room.id}
                to={room.status === 'COMPLETED' ? `/history/${room.id}` : `/room/${room.id}`}
                className="flex items-center justify-between p-4 hover:bg-game-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{room.name}</span>
                      {room.isHost && (
                        <span className="text-xs bg-game-highlight/20 text-game-highlight px-2 py-0.5 rounded">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Code: {room.code} - {room.participantCount} players
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      room.status
                    )}`}
                  >
                    {room.status.replace('_', ' ')}
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-500"
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
