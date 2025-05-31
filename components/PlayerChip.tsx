import React from 'react';
import { Player } from '../types';

interface PlayerChipProps {
  player: Player;
  isCurrentUser?: boolean;
}

const PlayerChip: React.FC<PlayerChipProps> = ({ player, isCurrentUser }) => {
  return (
    <div className={`flex items-center p-2 rounded-lg shadow transition-all duration-150 ease-in-out hover:shadow-md hover:scale-[1.02] ${player.color.replace('bg-', 'border-')} border-2 ${isCurrentUser ? 'bg-gray-200 dark:bg-slate-700' : 'bg-white dark:bg-slate-800'}`}>
      <span className={`w-3 h-3 rounded-full mr-2 ${player.color} shadow-sm`}></span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{player.name}{isCurrentUser && " (You)"}</span>
    </div>
  );
};

export default PlayerChip;