import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">Image Evolution</span>
          <br />
          <span className="text-white">Game</span>
        </h1>

        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Collaborate with friends to evolve images through AI-powered prompts.
          Take turns, watch the magic unfold, and see where your creativity leads!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          {user ? (
            <>
              <Link to="/create" className="btn btn-primary text-lg px-8 py-3">
                Create a Room
              </Link>
              <Link to="/join" className="btn btn-secondary text-lg px-8 py-3">
                Join a Game
              </Link>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
          )}
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-8"
      >
        <div className="card p-6">
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="text-lg font-semibold mb-2">AI-Powered Editing</h3>
          <p className="text-gray-400 text-sm">
            Use natural language prompts to transform images with Gemini Nano AI
          </p>
        </div>

        <div className="card p-6">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">Real-Time Collaboration</h3>
          <p className="text-gray-400 text-sm">
            Play with friends in real-time with instant updates and chat
          </p>
        </div>

        <div className="card p-6">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold mb-2">Turn-Based Evolution</h3>
          <p className="text-gray-400 text-sm">
            Take turns to see how your collective creativity evolves the image
          </p>
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-16 max-w-3xl mx-auto"
      >
        <h2 className="text-2xl font-bold mb-8">How It Works</h2>

        <div className="space-y-6 text-left">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-game-highlight flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h4 className="font-medium mb-1">Create or Join a Room</h4>
              <p className="text-gray-400 text-sm">
                Start a new game room or join an existing one with a room code
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-game-highlight flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h4 className="font-medium mb-1">Begin with an Image or Prompt</h4>
              <p className="text-gray-400 text-sm">
                Upload a starting image or generate one with a text prompt
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-game-highlight flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h4 className="font-medium mb-1">Take Turns Editing</h4>
              <p className="text-gray-400 text-sm">
                Each player takes a turn providing a prompt to transform the image
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-game-highlight flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <h4 className="font-medium mb-1">View the Evolution</h4>
              <p className="text-gray-400 text-sm">
                Watch how the image evolves and see the complete journey at the end
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
