import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, LogIn, Info } from 'lucide-react';

export default function MultiplayerLobbyPage() {
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="w-full h-full flex flex-col bg-ocean-deep p-6 overflow-y-auto">
      <div className="flex items-center mb-6">
        <Link to="/" className="retro-btn bg-storm-mid text-white text-sm mr-4 flex items-center gap-1.5">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-3xl font-display text-accent-yellow flex items-center gap-2"
          style={{ textShadow: '2px 2px 0px #000000' }}>
          <Users size={28} />
          Multiplayer
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
        {/* Create Room */}
        <div className="retro-card !bg-ocean-mid text-white text-center">
          <Plus size={32} className="mx-auto text-accent-green mb-2" />
          <h2 className="font-display text-xl mb-4">Create a Room</h2>
          <p className="font-body text-sm mb-6">
            Host a co-op game and invite up to 3 friends.
          </p>
          <button className="retro-btn-primary w-full flex items-center justify-center gap-2">
            <Plus size={18} />
            Create Room
          </button>
        </div>

        {/* Join Room */}
        <div className="retro-card !bg-ocean-mid text-white">
          <LogIn size={32} className="mx-auto text-accent-yellow mb-2" />
          <h2 className="font-display text-xl mb-4 text-center">Join a Room</h2>
          <input
            type="text"
            placeholder="Enter 6-character code"
            className="retro-input w-full mb-4 text-center uppercase tracking-widest"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="retro-btn-primary w-full flex items-center justify-center gap-2"
            disabled={roomCode.length < 6}
          >
            <LogIn size={18} />
            Join Room
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="retro-card !bg-storm-dark max-w-2xl mx-auto w-full mt-6 flex items-start gap-3">
        <Info size={20} className="text-accent-yellow mt-0.5 shrink-0" />
        <p className="font-body text-storm-light text-sm">
          Multiplayer requires the backend server to be running. Set up your server first, then come back here to create or join rooms.
        </p>
      </div>
    </div>
  );
}
