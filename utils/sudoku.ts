
import { Difficulty, SudokuGridType, CellData } from '../types';

const GRID_SIZE = 9;
const BOX_SIZE = 3;

function shuffleArray<T,>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function isSafe(board: number[][], row: number, col: number, num: number): boolean {
  for (let x = 0; x < GRID_SIZE; x++) {
    if (board[row][x] === num || board[x][col] === num) {
      return false;
    }
  }

  const startRow = row - (row % BOX_SIZE);
  const startCol = col - (col % BOX_SIZE);
  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      if (board[i + startRow][j + startCol] === num) {
        return false;
      }
    }
  }
  return true;
}

function solveSudoku(board: number[][]): boolean {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (board[row][col] === 0) {
        const numbers = shuffleArray([...Array(GRID_SIZE).keys()].map(n => n + 1));
        for (const num of numbers) {
          if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) {
              return true;
            }
            board[row][col] = 0; // Backtrack
          }
        }
        return false; // No valid number found
      }
    }
  }
  return true; // All cells filled
}

export function generateSudokuSolution(): number[][] {
  const board: number[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  solveSudoku(board);
  return board;
}

export function createPuzzle(solution: number[][], difficulty: Difficulty): (number | null)[][] {
  const puzzle = solution.map(row => [...row]);
  let cellsToRemove: number;

  switch (difficulty) {
    case Difficulty.Easy:
      cellsToRemove = 35; // Approx 46 cells filled
      break;
    case Difficulty.Medium:
      cellsToRemove = 45; // Approx 36 cells filled
      break;
    case Difficulty.Hard:
      cellsToRemove = 55; // Approx 26 cells filled
      break;
    default:
      cellsToRemove = 40;
  }
  
  // More sophisticated removal would ensure a unique solution, this is simplified
  let attempts = cellsToRemove;
  while (attempts > 0) {
    const row = Math.floor(Math.random() * GRID_SIZE);
    const col = Math.floor(Math.random() * GRID_SIZE);
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      attempts--;
    }
  }
  return puzzle;
}

export function createInitialGrid(puzzle: (number | null)[][]): SudokuGridType {
  return puzzle.map(row =>
    row.map(value => ({
      value,
      isOriginal: value !== null,
      isInvalid: false,
    }))
  );
}

export function checkMove(board: SudokuGridType, row: number, col: number, num: number | null): boolean {
  if (num === null) return true; // Clearing a cell is always valid in terms of rules

  // Check row
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== col && board[row][c].value === num) return false;
  }
  // Check column
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r !== row && board[r][col].value === num) return false;
  }
  // Check 3x3 box
  const boxRowStart = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxColStart = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRowStart; r < boxRowStart + BOX_SIZE; r++) {
    for (let c = boxColStart; c < boxColStart + BOX_SIZE; c++) {
      if (r !== row && c !== col && board[r][c].value === num) return false;
    }
  }
  return true;
}

export function isBoardSolved(board: SudokuGridType, solution: number[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c].value === null || board[r][c].value !== solution[r][c]) {
        return false;
      }
    }
  }
  return true;
}

export function getPlayerColor(index: number): string {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  return colors[index % colors.length];
}
