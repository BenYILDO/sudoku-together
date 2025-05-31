
import React from 'react';
import { 
  ArrowUturnLeftIcon, 
  BackspaceIcon, 
  PencilIcon, 
  LightBulbIcon,
  CheckCircleIcon,
  PlayIcon as PlayIconSolid // Renamed to avoid conflict if PlayIcon outline is used elsewhere
} from '@heroicons/react/24/solid'; // Using solid icons for clearer actions

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
      text-gray-600 hover:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50
      transition-colors duration-150 relative
      w-16 h-16 sm:w-20 sm:h-20
      ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100'}
      ${className}
    `}
  >
    <span className="w-6 h-6 sm:w-7 sm:h-7 mb-0.5">{icon}</span>
    <span className="text-xs sm:text-sm">{text}</span>
    {badge !== undefined && (
      <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 leading-tight">
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
      flex-1 h-12 sm:h-14 rounded-md shadow-sm 
      bg-blue-500 hover:bg-blue-600 text-white font-bold text-2xl sm:text-3xl
      disabled:bg-gray-300 disabled:text-gray-500
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400
      transition-colors duration-150
    "
  >
    {number}
  </button>
);


interface BottomControlsProps {
  onNumberPress: (num: number | null) => void; // null for erase via dedicated button
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
  disabled?: boolean; // Overall disable for pause/game over
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
  
  const overallDisabled = disabled || !canInteract;

  return (
    <div className="w-full max-w-md mx-auto p-3 space-y-3 sm:space-y-4 bg-white dark:bg-slate-800 rounded-t-xl shadow-lg">
      {/* Action Icons */}
      <div className="flex justify-around items-center gap-1 sm:gap-2" role="toolbar" aria-label="Game Actions">
        <ActionButton 
          onClick={onUndo} 
          icon={<ArrowUturnLeftIcon />} 
          text="Undo" 
          disabled={overallDisabled || !canUndo} 
        />
        <ActionButton 
          onClick={onErase} 
          icon={<BackspaceIcon />} 
          text="Erase"
          disabled={overallDisabled}
        />
        <ActionButton 
          onClick={onToggleNotesMode} 
          icon={<PencilIcon />} 
          text="Notes"
          isActive={isNotesMode}
          disabled={overallDisabled}
        />
        <ActionButton 
          onClick={onHint} 
          icon={<LightBulbIcon />} 
          text="Hint" 
          badge={remainingHints} 
          disabled={overallDisabled || remainingHints <= 0} 
        />
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5" role="group" aria-label="Number Input">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <NumberButton 
            key={num} 
            number={num} 
            onClick={() => onNumberPress(num)} 
            disabled={overallDisabled}
          />
        ))}
      </div>
      
      {/* Secondary Actions: Validate and Solve */}
      {(onValidate || onSolve) && (
        <div className="pt-2 flex justify-center gap-2 sm:gap-3">
          {onValidate && (
            <button
              onClick={onValidate}
              type="button"
              disabled={overallDisabled}
              className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md shadow-sm text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Validate
            </button>
          )}
          {onSolve && (
             <button
              onClick={onSolve}
              type="button"
              disabled={disabled} // Solve might be enabled even if interaction is not (e.g. game over but not by player)
              className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-md shadow-sm text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors"
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
