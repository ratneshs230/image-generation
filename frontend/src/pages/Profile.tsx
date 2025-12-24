import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { UserStatistics } from '../types';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
  }, [user]);

  const loadStats = async () => {
    try {
      const response = await userApi.getStats();
      setStats(response.data.statistics);
    } catch (error) {
      // Ignore
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await userApi.updateProfile({ displayName: displayName.trim() });
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <div className="grid gap-6">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-20 h-20 rounded-full border-2 border-gray-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-game-accent flex items-center justify-center text-2xl font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold">
                {user.displayName || user.username}
              </h2>
              <p className="text-gray-400">@{user.username}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                {user.provider === 'google' ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                    </svg>
                    Connected with Google
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                      />
                    </svg>
                    Connected with GitHub
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Edit Display Name */}
          <form onSubmit={handleUpdateProfile}>
            <label className="block text-sm font-medium mb-2">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="input flex-1"
                maxLength={50}
              />
              <button
                type="submit"
                disabled={saving || displayName === user.displayName}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>

        {/* Statistics */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Statistics</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-game-accent rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-game-highlight">
                {stats?.gamesPlayed || 0}
              </div>
              <div className="text-sm text-gray-400">Games Played</div>
            </div>

            <div className="bg-game-accent rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary-400">
                {stats?.gamesHosted || 0}
              </div>
              <div className="text-sm text-gray-400">Games Hosted</div>
            </div>

            <div className="bg-game-accent rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                {stats?.totalTurns || 0}
              </div>
              <div className="text-sm text-gray-400">Total Turns</div>
            </div>

            <div className="bg-game-accent rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {stats?.gamesWon || 0}
              </div>
              <div className="text-sm text-gray-400">Games Won</div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Username</span>
              <span>@{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Provider</span>
              <span className="capitalize">{user.provider}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
