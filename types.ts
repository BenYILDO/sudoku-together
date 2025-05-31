
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export interface CellData {
  value: number | null;
  isOriginal: boolean;
  isInvalid: boolean;
  lastModifiedBy?: string; // Player ID
  noteNumbers?: number[]; // For pencil marks
}

export type SudokuGridType = CellData[][];

export interface Player {
  id: string;
  name: string;
  color: string;
  lastActivityTimestamp: number; // Timestamp of last action/focus
}

export interface PlayerFocus {
  [playerId: string]: { r: number; c: number } | null; // null if not focused
}

export interface GameState {
  gameId: string;
  difficulty: Difficulty;
  initialBoard: (number | null)[][];
  currentBoard: SudokuGridType;
  solution: number[][];
  players: Player[];
  hostPlayerId?: string;
  password?: string;
  startTime: number | null; // Timestamp
  endTime: number | null; // Timestamp
  isGameOver: boolean;
  
  playerScores: { [playerId: string]: number };
  playerComboCounts: { [playerId: string]: number };
  totalGameLives: number; // Changed from playerLives
  completedUnits: { 
    boxes: Set<string>; 
    rows: Set<string>;  
    cols: Set<string>;  
  };
  gameOutcome?: 'solved' | 'failed' | 'inprogress'; 
  gameWinnerId?: string; 
  lastModifierId?: string; // ID of player who made the last move

  playerFocusMap: PlayerFocus;
  history: { board: SudokuGridType; player: string; move: { r: number; c: number; value: number | null } }[];
}

export interface RoomInfo {
  gameId: string;
  difficulty: Difficulty;
  playerCount: number;
  hasPassword?: boolean;
  createdAt: number; 
  isGameOver?: boolean;
}

export interface HintResponse {
  suggestedNumber: number | null;
  message: string;
}

// Represents stats relevant for the current player to display in TopInfoBar
export interface CurrentPlayerDisplayStats {
  score: number;
  combo: number; 
}
