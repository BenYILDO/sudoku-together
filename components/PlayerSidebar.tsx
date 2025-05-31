
import React from 'react';
import { Player } from '../types';
import { HeartIcon, UserCircleIcon } from '@heroicons/react/24/solid'; // HeartIcon might not be needed here anymore

interface PlayerSidebarProps {
  players: Player[];
  playerScores: { [playerId: string]: number };
  // playerLives prop removed
  currentPlayerId: string;
  lastModifierId?: string; 
  className?: string;
}

const PlayerInfoCard: React.FC<{
  player: Player;
  score: number;
  // lives prop removed
  isCurrentPlayer: boolean;
  isLastModifier: boolean;
}> = ({ player, score, isCurrentPlayer, isLastModifier }) => {

  return (
    <div 
        className={`
            p-3 rounded-lg shadow-md transition-all duration-200 ease-in-out
            ${isCurrentPlayer ? 'bg-indigo-100 dark:bg-indigo-700/50 border-2 border-indigo-500 dark:border-indigo-400' : 'bg-white dark:bg-slate-700 hover:shadow-lg'}
            ${isLastModifier && !isCurrentPlayer ? 'ring-2 ring-pink-500 dark:ring-pink-400' : ''}
        `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className={`w-4 h-4 rounded-full mr-2 shadow-inner ${player.color}`} aria-label={`${player.name}'s color indicator`}></span>
          <span className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-100 truncate max-w-[120px] sm:max-w-[150px]">{player.name}</span>
          {isCurrentPlayer && <span className="ml-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">(You)</span>}
        </div>
        {isLastModifier && (
            <span title="Last active" className={`w-2.5 h-2.5 rounded-full ${player.color} animate-pulseActive shadow-md`}></span>
        )}
      </div>
      <div className="flex justify-between items-center text-xs sm:text-sm">
        <div className="text-gray-600 dark:text-gray-300">
          Score: <span className="font-bold text-indigo-600 dark:text-indigo-400">{score}</span>
        </div>
        {/* Individual lives display removed */}
      </div>
    </div>
  );
};

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({
  players,
  playerScores,
  currentPlayerId,
  lastModifierId,
  className
}) => {
  return (
    <aside className={`p-3 bg-gray-100 dark:bg-slate-800 rounded-lg shadow-xl ${className} overflow-y-auto max-h-[calc(100vh-200px)] md:max-h-none`}>
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-700 dark:text-gray-200 border-b pb-2 border-gray-300 dark:border-slate-600">
        Players ({players.length})
      </h2>
      {players.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {players.sort((a,b) => (playerScores[b.id] || 0) - (playerScores[a.id] || 0)).map((player) => (
            <PlayerInfoCard
              key={player.id}
              player={player}
              score={playerScores[player.id] || 0}
              isCurrentPlayer={player.id === currentPlayerId}
              isLastModifier={player.id === lastModifierId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            <UserCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-50"/>
            <p>No players in this room yet.</p>
            <p className="text-xs">Share the Game ID!</p>
        </div>
      )}
    </aside>
  );
};

export default PlayerSidebar;
