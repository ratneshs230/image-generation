'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLocalUser, updateUserName, LocalUser } from '@/lib/local-storage';

export function Navbar() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setUser(getLocalUser());
  }, []);

  const handleSaveName = () => {
    if (newName.trim()) {
      const updated = updateUserName(newName.trim());
      setUser(updated);
    }
    setIsEditing(false);
  };

  return (
    <nav className="bg-game-card border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🎨</span>
            <span className="text-xl font-bold gradient-text">Image Evolution</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors"
            >
              My Games
            </Link>
            <Link href="/play" className="btn btn-primary text-sm">
              New Game
            </Link>

            {/* User Display */}
            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-700">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Your name"
                    className="input text-sm w-32"
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="btn btn-ghost text-sm">
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-game-accent flex items-center justify-center text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button
                    onClick={() => {
                      setNewName(user?.name || '');
                      setIsEditing(true);
                    }}
                    className="text-gray-300 text-sm hover:text-white"
                  >
                    {user?.name || 'Guest'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
