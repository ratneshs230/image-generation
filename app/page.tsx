import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';

export default async function Home() {
  const session = await getAuthSession();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <div>
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
          {session ? (
            <>
              <Link href="/create" className="btn btn-primary text-lg px-8 py-3">
                Create a Room
              </Link>
              <Link href="/join" className="btn btn-secondary text-lg px-8 py-3">
                Join a Game
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-8">
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
            Play with friends in real-time with instant updates
          </p>
        </div>

        <div className="card p-6">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold mb-2">Turn-Based Evolution</h3>
          <p className="text-gray-400 text-sm">
            Take turns to see how your collective creativity evolves the image
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">How It Works</h2>

        <div className="space-y-6 text-left">
          {[
            { step: 1, title: 'Create or Join a Room', desc: 'Start a new game room or join with a code' },
            { step: 2, title: 'Begin with an Image or Prompt', desc: 'Upload a starting image or generate one' },
            { step: 3, title: 'Take Turns Editing', desc: 'Each player provides a prompt to transform the image' },
            { step: 4, title: 'View the Evolution', desc: 'Watch how the image evolves and see the journey' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-game-highlight flex items-center justify-center shrink-0">
                {step}
              </div>
              <div>
                <h4 className="font-medium mb-1">{title}</h4>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
