import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">Image Evolution</span>
          <br />
          <span className="text-white">Game</span>
        </h1>

        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Create and evolve images through AI-powered prompts.
          Watch the magic unfold and see where your creativity leads!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link href="/play" className="btn btn-primary text-lg px-8 py-3">
            Start Creating
          </Link>
          <Link href="/dashboard" className="btn btn-secondary text-lg px-8 py-3">
            View My Games
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-8">
        <div className="card p-6">
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="text-lg font-semibold mb-2">AI-Powered Creation</h3>
          <p className="text-gray-400 text-sm">
            Use natural language prompts to generate and transform images with Gemini AI
          </p>
        </div>

        <div className="card p-6">
          <div className="text-4xl mb-4">💾</div>
          <h3 className="text-lg font-semibold mb-2">Local Storage</h3>
          <p className="text-gray-400 text-sm">
            All your images and games are saved locally on your device
          </p>
        </div>

        <div className="card p-6">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold mb-2">Image Evolution</h3>
          <p className="text-gray-400 text-sm">
            Build upon previous images to see how your creations evolve
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">How It Works</h2>

        <div className="space-y-6 text-left">
          {[
            { step: 1, title: 'Start a New Game', desc: 'Create a game session to begin generating images' },
            { step: 2, title: 'Enter a Prompt', desc: 'Describe the image you want to create' },
            { step: 3, title: 'Generate and Evolve', desc: 'Watch AI generate your image, then modify it with new prompts' },
            { step: 4, title: 'Save and Share', desc: 'Download your images and export your game history' },
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
