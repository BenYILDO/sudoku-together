import React from 'react';
import { 
  ArrowUturnLeftIcon, 
  BackspaceIcon, 
  PencilIcon, 
  LightBulbIcon,
  CheckCircleIcon,
  PlayIcon as PlayIconSolid
} from '@heroicons/react/24/solid';

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
  disabled?: boolean;
  className?: string;
  badge?: string | number;
  isActive?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, text, disabled, className, badge, isActive }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={text}
    className={`
      flex flex-col items-center justify-center p-2 rounded-lg 
      text-gray-600 dark:text-gray-300 
      hover:bg-gray-200 dark:hover:bg-slate-600/70
      disabled:text-gray-400 dark:disabled:text-gray-500 
      disabled:hover:bg-transparent dark:disabled:hover:bg-transparent
      disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-opacity-70 focus:ring-offset-1 dark:focus:ring-offset-slate-800
      transition-all duration-150 ease-in-out
      relative group
      w-16 h-16 sm:w-20 sm:h-20
      ${isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500 dark:text-indigo-100' : 'bg-gray-100 dark:bg-slate-600'}
      ${disabled ? '' : 'hover:scale-105 active:scale-95'}
      ${className}
    `}
  >
    <span className="w-6 h-6 sm:w-7 sm:h-7 mb-0.5 transition-transform duration-150 group-hover:scale-110">{icon}</span>
    <span className="text-xs sm:text-sm">{text}</span>
    {badge !== undefined && (
      <span className={`absolute top-1 right-1 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 leading-tight shadow-md ${disabled ? 'opacity-70' : ''}`}>
        {badge}
      </span>
    )}
  </button>
);

interface NumberButtonProps {
  number: number;
  onClick: (num: number) => void;
  disabled?: boolean;
}

const NumberButton: React.FC<NumberButtonProps> = ({ number, onClick, disabled }) => (
  <button
    type="button"
    onClick={() => onClick(number)}
    disabled={disabled}
    aria-label={`Enter number ${number}`}
    className="
      flex-1 h-11 sm:h-12 md:h-14 rounded-md shadow-sm 
      bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500
      text-white font-bold text-xl sm:text-2xl md:text-3xl
      disabled:bg-gray-300 dark:disabled:bg-slate-500 
      disabled:text-gray-500 dark:disabled:text-gray-400
      disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-blue-400 dark:focus:ring-blue-300
      transition-all duration-150 ease-in-out
      ${disabled ? '' : 'hover:scale-105 active:scale-95'}
    "
  >
    {number}
  </button>
);


interface BottomControlsProps {
  onNumberPress: (num: number | null) => void;
  onUndo: () => void;
  onErase: () => void;
  onToggleNotesMode: () => void;
  onHint: () => void;
  isNotesMode: boolean;
  remainingHints: number;
  canUndo: boolean;
  onValidate?: () => void;
  onSolve?: () => void;
  canInteract: boolean; 
  disabled?: boolean; 
}

const BottomControls: React.FC<BottomControlsProps> = ({
  onNumberPress,
  onUndo,
  onErase,
  onToggleNotesMode,
  onHint,
  isNotesMode,
  remainingHints,
  canUndo,
  onValidate,
  onSolve,
  canInteract, 
  disabled, 
}) => {
  
  const baseDisabled = disabled || !canInteract;

  return (
    <div className="w-full max-w-md lg:max-w-lg mx-auto p-3 space-y-3 sm:space-y-4 bg-white dark:bg-slate-800 rounded-t-xl shadow-2xl">
      {/* Action Icons */}
      <div className="flex justify-around items-center gap-1 sm:gap-2" role="toolbar" aria-label="Game Actions">
        <ActionButton 
          onClick={onUndo} 
          icon={<ArrowUturnLeftIcon />} 
          text="Undo" 
          disabled={baseDisabled || !canUndo} 
        />
        <ActionButton 
          onClick={onErase} 
          icon={<BackspaceIcon />} 
          text="Erase"
          disabled={baseDisabled}
        />
        <ActionButton 
          onClick={onToggleNotesMode} 
          icon={<PencilIcon />} 
          text="Notes"
          isActive={isNotesMode}
          disabled={baseDisabled}
        />
        <ActionButton 
          onClick={onHint} 
          icon={<LightBulbIcon />} 
          text="Hint" 
          badge={remainingHints} 
          disabled={baseDisabled || remainingHints <= 0} 
        />
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5" role="group" aria-label="Number Input">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <NumberButton 
            key={num} 
            number={num} 
            onClick={() => onNumberPress(num)} 
            disabled={baseDisabled}
          />
        ))}
      </div>
      
      {(onValidate || onSolve) && (
        <div className="pt-2 flex justify-center gap-2 sm:gap-3">
          {onValidate && (
            <button
              onClick={onValidate}
              type="button"
              disabled={baseDisabled}
              className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md shadow-sm text-xs sm:text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Validate
            </button>
          )}
          {onSolve && (
             <button
              onClick={onSolve}
              type="button"
              disabled={disabled} 
              className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-md shadow-sm text-xs sm:text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <PlayIconSolid className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Solve
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BottomControls;