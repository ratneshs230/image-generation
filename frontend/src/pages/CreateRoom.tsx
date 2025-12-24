import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomApi } from '../services/api';
import toast from 'react-hot-toast';

export default function CreateRoom() {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [maxTurns, setMaxTurns] = useState(10);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setLoading(true);

    try {
      const response = await roomApi.create(name.trim(), maxPlayers, maxTurns);
      toast.success('Room created successfully!');
      navigate(`/room/${response.data.room.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create a Room</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Room Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Room Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter a name for your room"
            className="input"
            maxLength={50}
            required
          />
        </div>

        {/* Max Players */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Max Players: {maxPlayers}
          </label>
          <input
            type="range"
            min="2"
            max="20"
            value={maxPlayers}
            onChange={e => setMaxPlayers(parseInt(e.target.value))}
            className="w-full accent-game-highlight"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>2</span>
            <span>20</span>
          </div>
        </div>

        {/* Max Turns */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Max Turns: {maxTurns}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={maxTurns}
            onChange={e => setMaxTurns(parseInt(e.target.value))}
            className="w-full accent-game-highlight"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>50</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="btn btn-primary w-full py-3"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="spinner w-4 h-4"></div>
              Creating...
            </span>
          ) : (
            'Create Room'
          )}
        </button>
      </form>

      <p className="text-center text-gray-500 text-sm mt-4">
        Share the room code with friends to let them join
      </p>
    </div>
  );
}
