import React, { useState } from 'react';
import { AvatarGraphic } from '../components/Avatars';
import { Copy, Check, Users, Sparkles, ChevronRight, UserPlus, Bell } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SquadLobbyScreenProps {
  roomCode: string;
  onStartMatch: () => void;
  userAvatar: string;
  userName: string;
  isHost: boolean;
  isMaster: boolean;
  onOpenMasterLogin: () => void;
}

const SAMPLE_FRIENDS = [
  { id: 'chloe', name: 'Chloe Bennett', avatar: 'dino', status: 'Online', rank: 'Gold' },
  { id: 'oliver', name: 'Oliver Brooks', avatar: 'minty', status: 'In Game', rank: 'Platinum' },
  { id: 'amelia', name: 'Amelia Clark', avatar: 'blaze', status: 'Online', rank: 'Master' },
];

export const SquadLobbyScreen: React.FC<SquadLobbyScreenProps> = ({
  roomCode,
  onStartMatch,
  userAvatar,
  userName,
  isHost,
  isMaster,
  onOpenMasterLogin,
}) => {
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState<Record<string, boolean>>({});

  const handleCopyCode = () => {
    sounds.playPawnHop();
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteFriend = (id: string) => {
    sounds.playTurnChirp();
    setInvited((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="w-full min-h-[100dvh] bg-gradient-to-b from-[#ACF234] via-[#C9F85B] to-[#EDFF9E] px-4 pt-4 pb-24 flex flex-col items-center select-none overflow-y-auto">
      
      {/* Mobile Shell */}
      <div className="w-full max-w-[430px] flex flex-col items-center">
        
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="cursor-pointer" onClick={onOpenMasterLogin}>
              <AvatarGraphic id={userAvatar} size={42} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-black/60 block">
                SQUAD LEADER
              </span>
              <span className="text-sm font-extrabold text-black block -mt-1">
                {userName}
              </span>
            </div>
          </div>

          <div className="relative p-2 rounded-full bg-white border border-black shadow-sm">
            <Bell size={16} />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
              2
            </div>
          </div>
        </div>

        {/* Display Title (Anton font) */}
        <h1 className="mt-4 text-[44px] sm:text-[52px] font-display text-[#121212] tracking-wider leading-none text-center">
          EXPEDITION
        </h1>

        {/* Hero Visual: Squad with Map & Backpacks */}
        <div className="relative my-2 w-full flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Squad Member 1 */}
            <div className="transform -rotate-12 translate-x-4 scale-95 z-10">
              <AvatarGraphic id="minty" size={90} />
            </div>

            {/* Squad Leader Dino */}
            <div className="transform scale-110 z-20">
              <AvatarGraphic id="dino" size={120} />
            </div>

            {/* Squad Member 2 */}
            <div className="transform rotate-12 -translate-x-4 scale-95 z-10">
              <AvatarGraphic id="james" size={90} />
            </div>

            {/* Floating Banner */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border-2 border-black text-[11px] font-extrabold shadow-md flex items-center gap-1.5 whitespace-nowrap">
              <Users size={14} />
              <span>ROOM: {roomCode}</span>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#121212] text-center mt-3">
          Build Your Team
        </h2>

        {/* Room Share Card */}
        <div className="w-full bg-white rounded-3xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-black/10 mt-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              INVITE CODE
            </span>
            <span className="text-xl font-display text-gray-900 tracking-widest block">
              {roomCode}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800 transition active:scale-95 shadow-sm"
          >
            {copied ? <Check size={14} className="text-[#ACF234]" /> : <Copy size={14} />}
            <span>{copied ? 'COPIED!' : 'COPY LINK'}</span>
          </button>
        </div>

        {/* Friends Section */}
        <div className="w-full mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-gray-700">Add friends</span>
            <span className="text-[11px] font-bold text-gray-500">3 Online</span>
          </div>

          {/* Friend Cards matching reference image */}
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_FRIENDS.map((friend) => (
              <div
                key={friend.id}
                className="bg-white rounded-2xl p-2.5 shadow-sm border border-black/5 flex flex-col items-center text-center relative group"
              >
                {/* Action Chevrons Indicator in Top Right */}
                <div className="absolute top-1.5 right-1.5 text-blue-500 font-bold text-[10px]">
                  &gt;&gt;
                </div>

                <AvatarGraphic id={friend.avatar} size={42} showStickerBorder={false} />
                <span className="text-xs font-extrabold text-gray-900 mt-1 truncate w-full">
                  {friend.name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {friend.rank}
                </span>

                <button
                  onClick={() => handleInviteFriend(friend.id)}
                  className={`mt-1.5 w-full py-1 rounded-full text-[10px] font-extrabold transition active:scale-95 ${
                    invited[friend.id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {invited[friend.id] ? 'SENT' : 'INVITE'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Ready / Start Match Big CTA */}
        <button
          onClick={onStartMatch}
          className="w-full mt-5 py-4 rounded-full bg-[#121212] hover:bg-black text-white font-display text-lg tracking-wider shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition transform active:scale-95 flex items-center justify-center gap-2"
        >
          <Sparkles size={20} className="text-[#ACF234]" />
          <span>START EXPEDITION</span>
        </button>

      </div>
    </div>
  );
};
