
import React from 'react';
import { Difficulty, CurrentPlayerDisplayStats } from '../types'; 
import { PlayIcon, PauseIcon, HeartIcon } from '@heroicons/react/24/solid';

interface TopInfoBarProps {
  difficulty: Difficulty;
  currentPlayerStats: CurrentPlayerDisplayStats; 
  totalGameLives: number; // Changed from playerStats.lives
  time: string;
  isPaused: boolean;
  onPauseToggle: () => void;
  gameMessage?: string;
  gameOutcome?: 'solved' | 'failed' | 'inprogress';
  winnerName?: string;
}

const InfoItem: React.FC<{ label: string; value: string | number | React.ReactNode; className?: string; valueClassName?: string, valueKey?: string }> = ({ label, value, className, valueKey, valueClassName }) => (
  <div className={`text-center ${className}`}>
    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
    <div key={valueKey} className={`text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 ${valueClassName}`}>{value}</div>
  </div>
);

const LivesDisplay: React.FC<{ count: number; maxLives?: number }> = ({ count, maxLives = 3 }) => {
  const hearts = [];
  for (let i = 0; i < maxLives; i++) {
    hearts.push(
      <HeartIcon 
        key={i} 
        className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${i < count ? 'text-red-500 animate-pulseCorrect' : 'text-gray-300 dark:text-gray-600'}`}
        style={{animationIterationCount: i < count ? 1 : 0, animationName: i < count ? 'pulseCorrect' : 'none'}}
      />
    );
  }
  return <div className="flex space-x-0.5 items-center justify-center h-full">{hearts}</div>;
};


const TopInfoBar: React.FC<TopInfoBarProps> = ({
  difficulty,
  currentPlayerStats,
  totalGameLives,
  time,
  isPaused,
  onPauseToggle,
  gameMessage,
  gameOutcome,
  winnerName,
}) => {
  let displayedMessage = gameMessage;
  let messageColor = 'text-gray-700 dark:text-gray-300';

  const scoreKey = `score-${currentPlayerStats.score}-${currentPlayerStats.combo}`; 
  const messageKey = `msg-${gameMessage}-${gameOutcome}-${Date.now()}`;

  if (gameOutcome === 'solved' && winnerName) {
    displayedMessage = `Solved by ${winnerName}! Final Time: ${time}. Your Score: ${currentPlayerStats.score}.`;
    messageColor = 'text-green-600 dark:text-green-400 font-semibold';
  } else if (gameOutcome === 'failed') {
    displayedMessage = `Game Over - Puzzle Failed! Final Time: ${time}. Your Score: ${currentPlayerStats.score}. Game Lives: ${totalGameLives}`;
    messageColor = 'text-red-600 dark:text-red-400 font-semibold';
  } else if (gameMessage && gameMessage.toLowerCase().includes("incorrect")) {
    messageColor = 'text-red-500 dark:text-red-400';
  } else if (gameMessage && (gameMessage.toLowerCase().includes("combo") || gameMessage.toLowerCase().includes("complete"))) {
    messageColor = 'text-purple-600 dark:text-purple-400 font-semibold';
  }


  return (
    <div className="w-full max-w-xl lg:max-w-2xl mx-auto p-3 bg-white dark:bg-slate-700 rounded-b-xl shadow-lg sticky top-0 z-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
        <InfoItem label="Difficulty" value={difficulty} />
        <InfoItem label="Your Score" value={currentPlayerStats.score} valueKey={scoreKey} valueClassName={`text-xl text-indigo-600 dark:text-indigo-400 ${currentPlayerStats.score > 0 ? 'animate-scoreUpdate' : ''}`} />
        <InfoItem label="Game Lives" value={<LivesDisplay count={totalGameLives} />} /> 
        
        <div className="flex items-center space-x-1 justify-center sm:justify-self-end">
          <InfoItem label="Time" value={time} />
          {gameOutcome === 'inprogress' && (
            <button
              onClick={onPauseToggle}
              aria-label={isPaused ? "Resume game" : "Pause game"}
              className="p-1.5 sm:p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-700 transition-colors"
            >
              {isPaused ? (
                <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          )}
        </div>
      </div>
      {currentPlayerStats.combo > 1 && gameOutcome === 'inprogress' && (
         <p key={`combo-${currentPlayerStats.combo}-${Date.now()}`} className="mt-1 text-center text-sm font-semibold text-purple-500 dark:text-purple-400 animate-messageSlideIn">
           Combo x{currentPlayerStats.combo}!
         </p>
      )}
      {displayedMessage && (
        <p key={messageKey} className={`mt-2 text-center text-xs sm:text-sm px-2 min-h-[1.25em] ${messageColor} animate-messageSlideIn`}>
          {displayedMessage}
        </p>
      )}
    </div>
  );
};

export default TopInfoBar;
