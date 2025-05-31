import React, { useEffect, useState, useRef } from 'react';
import { SudokuGridType, Player, PlayerFocus, CellData } from '../types';

interface SudokuCellProps {
  cellData: CellData & { noteNumbers?: number[] };
  rowIndex: number;
  colIndex: number;
  isSelected: boolean;
  isHighlighted: boolean; 
  onCellSelect: (r: number, c: number) => void;
  players: Player[];
  playerFocusMap: PlayerFocus;
  currentUserId?: string;
  isNotesMode: boolean;
  animatedCellKey: string | null; // Key to trigger animation: `${r}-${c}-${type}-${timestamp}`
}

const Cell: React.FC<SudokuCellProps> = ({
  cellData,
  rowIndex,
  colIndex,
  isSelected,
  isHighlighted,
  onCellSelect,
  players,
  playerFocusMap,
  currentUserId,
  isNotesMode,
  animatedCellKey,
}) => {
  const [currentAnimation, setCurrentAnimation] = useState<string>('');
  const animationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setCurrentAnimation(''); // Clear previous animation immediately

    if (animatedCellKey) {
      const [rStr, cStr, type] = animatedCellKey.split('-'); // Corrected line
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);
      
      if (r === rowIndex && c === colIndex) {
        let animationClass = '';
        let duration = 600; // Default duration
        if (type === 'correct') animationClass = 'animate-pulseCorrect';
        else if (type === 'incorrect') {
            animationClass = 'animate-shake animate-pulseIncorrect'; // Combine shake and pulse
            duration = 600; // Shake is 0.5s, pulse is 0.6s
        }
        else if (type === 'hint') {
            animationClass = 'animate-pulseHint';
            duration = 800;
        }
        else if (type === 'selected' && isSelected) { // Only apply selected animation if cell is indeed selected
            animationClass = 'animate-selectedPulse';
            duration = 300;
        }
        
        if (animationClass) {
          setCurrentAnimation(animationClass);
          animationTimeoutRef.current = window.setTimeout(() => {
            setCurrentAnimation('');
          }, duration);
        }
      }
    }
    
    // Cleanup timeout on unmount or if animatedCellKey changes before timeout finishes
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [animatedCellKey, rowIndex, colIndex, isSelected]);


  const handleClick = () => {
    onCellSelect(rowIndex, colIndex);
  };
  
  const focusedByPlayers = Object.entries(playerFocusMap)
    .filter(([, pos]) => pos && pos.r === rowIndex && pos.c === colIndex)
    .map(([playerId]) => players.find(p => p.id === playerId))
    .filter((p): p is Player => p !== undefined); // Type guard
  
  const modifier = players.find(p => p.id === cellData.lastModifiedBy);

  let cellClasses = `sudoku-cell w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 flex items-center justify-center border border-gray-300 dark:border-gray-600 transition-all duration-100 relative cursor-default text-base sm:text-lg md:text-xl ${currentAnimation}`;
  
  if (cellData.isOriginal) {
    cellClasses += " bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-gray-100 font-semibold";
  } else {
    cellClasses += " bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300"; 
    if (isNotesMode || !cellData.value) cellClasses += " cursor-pointer";
    else cellClasses += " cursor-pointer"; 
  }

  if (isSelected) {
    // Selection animation is handled by 'animate-selectedPulse' via animatedCellKey
    // Static selection style:
    cellClasses += " ring-2 ring-blue-500 dark:ring-blue-400 z-10";
    if (!currentAnimation.includes('animate-selectedPulse')) { // Apply a different bg if not currently animating selection pulse
       cellClasses += " bg-blue-100 dark:bg-blue-800/50";
    }
  } else if (isHighlighted) {
    cellClasses += " bg-blue-50 dark:bg-slate-600/60";
  }

  if (cellData.isInvalid && !cellData.isOriginal && cellData.value !== null) {
    // Incorrect animation is handled by 'animate-pulseIncorrect' or 'animate-shake'
    // Static invalid style (less prominent if animating):
    if (!currentAnimation.includes('animate-pulseIncorrect') && !currentAnimation.includes('animate-shake')) {
      cellClasses += " !bg-red-100 dark:!bg-red-800/50 !text-red-700 dark:!text-red-300";
    }
  }
  
  if ((colIndex + 1) % 3 === 0 && colIndex < 8) cellClasses += " border-r-2 border-r-gray-400 dark:border-r-gray-500";
  if ((rowIndex + 1) % 3 === 0 && rowIndex < 8) cellClasses += " border-b-2 border-b-gray-400 dark:border-b-gray-500";
  if (rowIndex === 0) cellClasses += " border-t-2 border-t-gray-400 dark:border-t-gray-500";
  if (colIndex === 0) cellClasses += " border-l-2 border-l-gray-400 dark:border-l-gray-500";
  // Explicitly ensure last row/col also have thick outer border if they are index 8
  if (rowIndex === 8) cellClasses += " border-b-2 border-b-gray-400 dark:border-b-gray-500";
  if (colIndex === 8) cellClasses += " border-r-2 border-r-gray-400 dark:border-r-gray-500";


  let cellContent;
  if (cellData.value !== null) {
    cellContent = <span className="text-xl sm:text-2xl md:text-3xl">{cellData.value}</span>;
  } else if (isNotesMode && cellData.noteNumbers && cellData.noteNumbers.length > 0) {
    cellContent = (
      <div className="grid grid-cols-3 gap-px text-[0.5rem] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight p-0.5 w-full h-full items-center justify-center">
        { [1,2,3,4,5,6,7,8,9].map(n => (
          <span key={n} className="w-full text-center">
            {cellData.noteNumbers?.includes(n) ? n : ''}
          </span>
        ))}
      </div>
    );
  } else {
    cellContent = <div className="w-full h-full"></div>; // Ensure cell takes full space for click
  }

  return (
    <div
      className={cellClasses}
      onClick={handleClick}
      onFocus={handleClick} 
      tabIndex={cellData.isOriginal ? -1 : 0} 
      role="gridcell"
      aria-selected={isSelected}
      aria-readonly={cellData.isOriginal}
      aria-invalid={cellData.isInvalid && cellData.value !== null}
      aria-label={`Cell R${rowIndex+1}C${colIndex+1}, value ${cellData.value ?? (cellData.noteNumbers && cellData.noteNumbers.length > 0 ? `notes ${cellData.noteNumbers.join(',')}`: 'empty')}`}
    >
      {cellContent}
      {focusedByPlayers.map(player => (
        player.id !== currentUserId &&
        <div
          key={player.id}
          title={`${player.name} is looking here`}
          className={`absolute top-0 left-0 w-full h-full border-2 rounded-sm pointer-events-none ${player.color.replace('bg-', 'border-')}`}
          style={{ opacity: 0.6, animation: `0.5s ease-in-out infinite alternate ${player.id.replace(/-/g,'')}_focusPulse` }}
        >
        <style>{`
          @keyframes ${player.id.replace(/-/g,'')}_focusPulse {
            from { opacity: 0.4; } to { opacity: 0.8; }
          }
        `}</style>
        </div>
      ))}
       {modifier && !cellData.isOriginal && cellData.value !== null && (
        <div 
          title={`Modified by ${modifier.name}`}
          className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${modifier.color} shadow-md`}
        ></div>
      )}
    </div>
  );
};


interface SudokuBoardProps {
  grid: SudokuGridType;
  selectedCell: { r: number; c: number } | null;
  onCellSelect: (r: number, c: number) => void;
  onCellValueChange: (r: number, c: number, value: number | null) => void; 
  players: Player[];
  playerFocusMap: PlayerFocus;
  currentUserId?: string;
  isNotesMode: boolean;
  animatedCellKey: string | null; // Pass down for cell animations
}

const SudokuBoard: React.FC<SudokuBoardProps> = ({ grid, selectedCell, onCellSelect, players, playerFocusMap, currentUserId, isNotesMode, animatedCellKey }) => {
  const getBoxStart = (index: number) => Math.floor(index / 3) * 3;

  return (
    <div 
      className="grid grid-cols-9 gap-0 shadow-xl rounded-md overflow-hidden border-2 border-gray-400 dark:border-gray-500 bg-gray-400 dark:bg-gray-500 mx-auto" 
      role="grid" 
      aria-label="Sudoku puzzle"
    >
      {grid.map((row, rIndex) =>
        row.map((cell, cIndex) => {
          const isSelected = selectedCell?.r === rIndex && selectedCell?.c === cIndex;
          let isHighlighted = false;

          if (selectedCell) {
            const inSelectedRow = selectedCell.r === rIndex;
            const inSelectedCol = selectedCell.c === cIndex;
            const inSelectedBox = 
              getBoxStart(selectedCell.r) === getBoxStart(rIndex) &&
              getBoxStart(selectedCell.c) === getBoxStart(cIndex);
            
            if (!isSelected && (inSelectedRow || inSelectedCol || inSelectedBox)) {
              isHighlighted = true;
            }
          }
          
          return (
            <Cell
              key={`${rIndex}-${cIndex}`}
              cellData={cell}
              rowIndex={rIndex}
              colIndex={cIndex}
              isSelected={isSelected}
              isHighlighted={isHighlighted && !isSelected} 
              onCellSelect={onCellSelect}
              players={players}
              playerFocusMap={playerFocusMap}
              currentUserId={currentUserId}
              isNotesMode={isNotesMode}
              animatedCellKey={animatedCellKey}
            />
          );
        })
      )}
    </div>
  );
};

export default SudokuBoard;