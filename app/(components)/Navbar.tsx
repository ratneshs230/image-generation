'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

export function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;

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
            {status === 'loading' ? (
              <div className="spinner w-5 h-5" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link href="/create" className="btn btn-primary text-sm">
                  Create Room
                </Link>
                <Link
                  href="/join"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Join
                </Link>

                {/* User Menu */}
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-700">
                  <Link href="/profile" className="flex items-center space-x-2">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || 'User'}
                        width={32}
                        height={32}
                        className="rounded-full border border-gray-600"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-game-accent flex items-center justify-center text-sm font-medium">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="text-gray-300 text-sm hidden sm:inline">
                      {user.name}
                    </span>
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
