import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-game-bg">
      {/* Navigation */}
      <nav className="bg-game-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎨</span>
              <span className="text-xl font-bold gradient-text">
                Image Evolution
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/create"
                    className="btn btn-primary text-sm"
                  >
                    Create Room
                  </Link>
                  <Link
                    to="/join"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Join
                  </Link>

                  {/* User Menu */}
                  <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-700">
                    {/* Connection Status */}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        connected ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      title={connected ? 'Connected' : 'Disconnected'}
                    />

                    {/* Avatar */}
                    <Link to="/profile" className="flex items-center space-x-2">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-8 h-8 rounded-full border border-gray-600"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-game-accent flex items-center justify-center text-sm font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-gray-300 text-sm hidden sm:inline">
                        {user.displayName || user.username}
                      </span>
                    </Link>

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <Link to="/login" className="btn btn-primary">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-game-card border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-500 text-sm">
            Image Evolution Game - Powered by Gemini Nano via Banana API
          </p>
        </div>
      </footer>
    </div>
  );
}
