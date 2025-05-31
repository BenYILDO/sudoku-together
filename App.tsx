import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import SudokuBoard from './components/SudokuBoard';
import BottomControls from './components/BottomControls';
import TopInfoBar from './components/TopInfoBar';
import PlayerSidebar from './components/PlayerSidebar'; // New component
import { Difficulty, GameState, Player, SudokuGridType, CellData, PlayerFocus, RoomInfo, CurrentPlayerDisplayStats } from './types';
import { generateSudokuSolution, createPuzzle, createInitialGrid, checkMove, isBoardSolved, getPlayerColor } from './utils/sudoku';
import { ClipboardDocumentCheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';
import { createGame } from './supabaseApi';

const GRID_SIZE = 9;
const BOX_SIZE = 3;
const INITIAL_HINT_COUNT = 3;
const MAX_GAME_LIVES = 3; // Total lives for the game

// Scoring constants
const POINTS_CORRECT_MOVE = 10;
const POINTS_COMBO_BASE = 5; 
const POINTS_BOX_COMPLETE = 50;
const POINTS_ROW_COMPLETE = 30;
const POINTS_COLUMN_COMPLETE = 30;

const getLocalStorageItem = <T,>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return null;
  }
};

const setLocalStorageItem = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error)
    {
    console.error("Error writing to localStorage:", error);
  }
};

const generatePlayer = (name?: string, existingPlayers?: Player[]): Player => {
  const playerId = uuidv4();
  const playerIndex = existingPlayers ? existingPlayers.length : 0;
  return {
    id: playerId,
    name: name || `Player ${playerIndex + 1}`,
    color: getPlayerColor(playerIndex),
    lastActivityTimestamp: Date.now(),
  };
};

const HomePage: React.FC<{ setCurrentPlayer: (player: Player) => void; currentPlayer: Player | null }> = ({ setCurrentPlayer, currentPlayer }) => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(currentPlayer?.name || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [roomPassword, setRoomPassword] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  const getGameLink = (gameId: string) => {
    return `${window.location.origin}/game/${gameId}`;
  };

  const copyToClipboard = (text: string, isLink?: boolean) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    }, (err) => {
      console.error('Failed to copy: ', err);
      alert(`Failed to copy ${isLink ? 'Game Link' : 'Game ID'}.`);
    });
  };

  useEffect(() => {
    const storedPlayer = getLocalStorageItem<Player>('sudokuCurrentPlayer');
    if (storedPlayer) {
      setCurrentPlayer(storedPlayer);
      setPlayerName(storedPlayer.name);
    }
    // Oda listesini Supabase'den çek
    async function fetchRooms() {
      const { data, error } = await supabase.from('games').select('game_id, data, created_at');
      if (!data) return;
      const roomInfos: RoomInfo[] = data.map((row: any) => {
        const gameState = row.data;
        return {
          gameId: row.game_id,
          difficulty: gameState.difficulty,
          playerCount: gameState.players.length,
          hasPassword: !!gameState.password,
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          isGameOver: gameState.isGameOver,
        };
      }).sort((a: RoomInfo, b: RoomInfo) => (b.createdAt || 0) - (a.createdAt || 0));
      setRooms(roomInfos);
    }
    fetchRooms();
  }, [setCurrentPlayer]);

  const handleCreateGame = async () => {
    let user = currentPlayer;
    if (!user || (playerName && playerName.trim() !== user.name)) {
      user = generatePlayer(playerName.trim() || 'Host');
      setCurrentPlayer(user);
      setLocalStorageItem('sudokuCurrentPlayer', user);
    } else if (user && playerName.trim() && playerName.trim() !== user.name) {
      user = {...user, name: playerName.trim(), lastActivityTimestamp: Date.now()};
      setCurrentPlayer(user);
      setLocalStorageItem('sudokuCurrentPlayer', user);
    }
    const gameId = uuidv4().slice(0, 8);
    const solution = generateSudokuSolution();
    const puzzle = createPuzzle(solution, difficulty);
    const initialBoard = createInitialGrid(puzzle);
    const hostPlayer = {...user!, lastActivityTimestamp: Date.now() };
    const newGame: GameState = {
      gameId,
      difficulty,
      initialBoard: puzzle,
      currentBoard: initialBoard,
      solution,
      players: [hostPlayer],
      hostPlayerId: hostPlayer.id,
      password: roomPassword || undefined,
      startTime: null,
      endTime: null,
      isGameOver: false,
      playerFocusMap: { [hostPlayer.id]: null },
      history: [],
      playerScores: { [hostPlayer.id]: 0 },
      playerComboCounts: { [hostPlayer.id]: 0 },
      totalGameLives: MAX_GAME_LIVES,
      completedUnits: { boxes: new Set(), rows: new Set(), cols: new Set() },
      gameOutcome: 'inprogress',
      lastModifierId: hostPlayer.id,
    };
    copyToClipboard(gameId);
    copyToClipboard(getGameLink(gameId), true);
    await createGame(gameId, serializeGameState(newGame));
    navigate(`/game/${gameId}`);
  };

  const handleJoinGame = async (gameIdToJoin: string) => {
    if (!gameIdToJoin.trim()) {
      alert("Please enter a Game ID.");
      return;
    }
    const { data: gameData, error } = await supabase.from('games').select('data').eq('game_id', gameIdToJoin.trim()).single();
    if (!gameData || !gameData.data) {
      alert("Game not found!");
      return;
    }
    const gameToJoin = deserializeGameState(gameData.data);
    if (gameToJoin.password && gameToJoin.password !== joinPassword) {
      alert("Incorrect password!");
      return;
    }
    let user = currentPlayer;
    if (!user || (playerName.trim() && playerName.trim() !== user.name)) {
      user = generatePlayer(playerName.trim() || `Player ${gameToJoin.players.length + 1}`, gameToJoin.players);
      setCurrentPlayer(user);
      setLocalStorageItem('sudokuCurrentPlayer', user);
    } else if (user && playerName.trim() && playerName.trim() !== user.name) {
      user = {...user, name: playerName.trim(), lastActivityTimestamp: Date.now()};
      setCurrentPlayer(user);
      setLocalStorageItem('sudokuCurrentPlayer', user);
    }
    const joiningPlayer = {...user!, lastActivityTimestamp: Date.now()};
    if (!gameToJoin.players.find(p => p.id === joiningPlayer.id)) {
      gameToJoin.players.push(joiningPlayer);
      gameToJoin.playerFocusMap[joiningPlayer.id] = null;
      gameToJoin.playerScores[joiningPlayer.id] = 0;
      gameToJoin.playerComboCounts[joiningPlayer.id] = 0;
      if (gameToJoin.totalGameLives === undefined) gameToJoin.totalGameLives = MAX_GAME_LIVES;
      if (!gameToJoin.completedUnits) gameToJoin.completedUnits = { boxes: new Set(), rows: new Set(), cols: new Set() };
      else {
        gameToJoin.completedUnits.boxes = new Set(Array.from(gameToJoin.completedUnits.boxes || []));
        gameToJoin.completedUnits.rows = new Set(Array.from(gameToJoin.completedUnits.rows || []));
        gameToJoin.completedUnits.cols = new Set(Array.from(gameToJoin.completedUnits.cols || []));
      }
      await supabase.from('games').update({ data: serializeGameState(gameToJoin) }).eq('game_id', gameIdToJoin.trim());
    }
    navigate(`/game/${gameIdToJoin.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-8 flex flex-col items-center">
      {showCopyFeedback && <div className="copy-feedback">Game ID Copied!</div>}
      <div className="animate-fadeIn w-full max-w-4xl">
        <h1 className="text-5xl sm:text-6xl font-bold mb-10 sm:mb-12 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 text-center">Sudoku Together</h1>
        
        <div className="w-full max-w-md bg-slate-800/70 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl mb-8 mx-auto animate-fadeIn-delay-1">
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-100">Your Player Profile</h2>
          <input
            type="text"
            placeholder="Enter Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-3 mb-1 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-colors duration-150"
            aria-label="Player Name"
          />
          { currentPlayer && <p className="text-xs text-center text-slate-400 mb-4">Player ID: {currentPlayer.id.slice(0,8)}...</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-8 w-full">
          <div className="bg-slate-800/70 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl animate-fadeIn-delay-2">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100">Create New Game</h2>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full p-3 mb-4 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors duration-150"
              aria-label="Select Difficulty"
            >
              {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              type="password"
              placeholder="Optional: Room Password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              className="w-full p-3 mb-6 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors duration-150"
              aria-label="Room Password"
            />
            <button
              onClick={handleCreateGame}
              disabled={!playerName.trim()}
              className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-md font-semibold transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Create Game & Copy ID
            </button>
            <button
              onClick={() => copyToClipboard(getGameLink(uuidv4().slice(0, 8)), true)}
              className="w-full mt-2 p-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 rounded-md font-semibold transition-all duration-150 ease-in-out hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Copy Example Game Link
            </button>
            {!playerName.trim() && <p className="text-xs text-red-400 mt-2">Please enter your name to create a game.</p>}
          </div>

          <div className="bg-slate-800/70 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl animate-fadeIn-delay-3">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100">Join Existing Game</h2>
            <input
              type="text"
              placeholder="Enter Game ID"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              className="w-full p-3 mb-4 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors duration-150"
              aria-label="Game ID to Join"
            />
            <input
              type="password"
              placeholder="Room Password (if any)"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="w-full p-3 mb-6 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors duration-150"
              aria-label="Password for Joining Game"
            />
            <button
              onClick={() => handleJoinGame(joinGameId)}
              disabled={!playerName.trim() || !joinGameId.trim()}
              className="w-full p-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-md font-semibold transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Join Game
            </button>
            {(!playerName.trim() || !joinGameId.trim()) && <p className="text-xs text-red-400 mt-2">Please enter your name and Game ID to join.</p>}
          </div>
        </div>

        <div className="w-full mt-10 sm:mt-12 animate-fadeIn-delay-3">
          <h2 className="text-2xl font-semibold mb-6 text-gray-100 text-center sm:text-left">Available Rooms</h2>
          {rooms.length === 0 ? (
            <div className="text-slate-400 text-center py-6 bg-slate-800/70 backdrop-blur-md rounded-lg shadow-md">
              <p className="text-lg">No active rooms found.</p>
              <p className="text-sm">Why not create one and invite your friends?</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {rooms.map(room => (
                <div key={room.gameId} className="bg-slate-800/70 backdrop-blur-md p-4 rounded-lg shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition-all duration-200 hover:bg-slate-700/80 group">
                  <div className="mb-3 sm:mb-0 flex-grow">
                    <div className="flex items-center mb-1">
                        <h3 className="text-lg font-semibold text-purple-300 group-hover:text-purple-200 transition-colors mr-2">Game ID:</h3>
                        <span className="text-yellow-400 font-mono bg-slate-700 px-2 py-0.5 rounded text-sm">{room.gameId}</span>
                    </div>
                    <p className="text-sm text-slate-300">Difficulty: {room.difficulty} | Players: {room.playerCount} {room.hasPassword ? "| Password Protected" : ""} {room.isGameOver ? "| Game Over" : ""}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => copyToClipboard(room.gameId)}
                        title="Copy Game ID"
                        className="flex-grow sm:flex-grow-0 p-2 px-3 bg-gray-600 hover:bg-gray-500 rounded-md text-xs font-semibold text-white disabled:opacity-50 transition-all duration-150 ease-in-out group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                        <ClipboardIcon className="w-4 h-4 inline mr-1" /> Copy ID
                    </button>
                    <button
                        onClick={() => copyToClipboard(getGameLink(room.gameId), true)}
                        title="Copy Game Link"
                        className="flex-grow sm:flex-grow-0 p-2 px-3 bg-blue-600 hover:bg-blue-500 rounded-md text-xs font-semibold text-white disabled:opacity-50 transition-all duration-150 ease-in-out group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                        <ClipboardIcon className="w-4 h-4 inline mr-1" /> Copy Link
                    </button>
                    <button
                        onClick={() => { setJoinGameId(room.gameId); if(!room.hasPassword && playerName.trim()) handleJoinGame(room.gameId); else if (playerName.trim()) { /* User needs to enter password in field */ } }}
                        disabled={!playerName.trim() || (room.hasPassword && !joinPassword && joinGameId === room.gameId)}
                        title={room.hasPassword ? "Enter password above then click 'Join Game'" : "Join this game"}
                        className="flex-grow sm:flex-grow-0 p-2 px-4 bg-teal-500 hover:bg-teal-400 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                        {room.isGameOver ? "View" : "Quick Join"}
                        {!room.hasPassword && !room.isGameOver ? "" : room.isGameOver ? "" : (room.hasPassword ? " (pwd)" : "")}
                  </button>
                  </div>
                </div>
              ))}
              {!playerName.trim() && <p className="text-xs text-red-400 mt-2 text-center">Enter your name to join rooms.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const GamePage: React.FC<{ currentPlayer: Player | null; setCurrentPlayer: (player: Player | null) => void; }> = ({ currentPlayer, setCurrentPlayer }) => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [localPlayer, setLocalPlayer] = useState<Player | null>(currentPlayer);
  const [message, setMessage] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isPaused, setIsPaused] = useState(false);
  const [hintCount, setHintCount] = useState(INITIAL_HINT_COUNT); 
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [animatedCellKey, setAnimatedCellKey] = useState<string | null>(null);

  // Oyun state'ini Supabase'den çek
  useEffect(() => {
    if (!gameId) return;
    let subscription: any;
    async function fetchGame() {
      const { data, error } = await supabase.from('games').select('data').eq('game_id', gameId).single();
      if (data && data.data) {
        setGameState(deserializeGameState(data.data));
      } else {
        setGameState(null);
      }
    }
    fetchGame();
    // Gerçek zamanlı dinleme
    subscription = supabase
      .channel('public:games')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `game_id=eq.${gameId}` }, (payload: any) => {
        if (payload.new && payload.new.data) {
          setGameState(deserializeGameState(payload.new.data));
        }
      })
      .subscribe();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [gameId]);

  // Oyun güncelleme fonksiyonu
  const updateGameState = useCallback(async (newGameState: GameState | null, options?: { addToHistory?: boolean; moveDetails?: {r:number, c:number, value: number | null} }) => {
    if (newGameState && gameId) {
      await supabase.from('games').update({ data: serializeGameState(newGameState) }).eq('game_id', gameId);
    }
    setGameState(newGameState);
  }, [gameId]);

  useEffect(() => {
    if (!localPlayer) {
      const storedPlayer = getLocalStorageItem<Player>('sudokuCurrentPlayer');
      if (storedPlayer) {
        setLocalPlayer(storedPlayer);
      } else {
        navigate('/'); 
        return;
      }
    }
  }, [localPlayer, navigate]);
  
  useEffect(() => {
    if (!gameId || !localPlayer) return;

    const loadGame = () => {
      let loadedGame = getLocalStorageItem<GameState>(`sudokuGame_${gameId}`);
      if (loadedGame) {
        if (!loadedGame.players.find(p => p.id === localPlayer.id)) {
          if (loadedGame.isGameOver) {
            setMessage("This game is already over. You are viewing.");
          } else if (loadedGame.password) { 
             const enteredPassword = prompt(`Joining game ${gameId}. This room is password protected. Enter password:`);
             if (enteredPassword !== loadedGame.password) {
                alert("Incorrect password.");
                navigate('/');
                return;
             }
          }
          if(!loadedGame.isGameOver) {
            const joiningPlayer = {...localPlayer, lastActivityTimestamp: Date.now()};
            loadedGame.players.push(joiningPlayer);
            loadedGame.playerFocusMap[joiningPlayer.id] = null;
            loadedGame.playerScores[joiningPlayer.id] = 0;
            loadedGame.playerComboCounts[joiningPlayer.id] = 0;
            // totalGameLives already exists or will be set below
          }
        }
        loadedGame.players = loadedGame.players.map(p => ({...p, lastActivityTimestamp: p.lastActivityTimestamp || Date.now() }));
        loadedGame.players.forEach(p => {
            if (!(p.id in loadedGame.playerFocusMap)) loadedGame.playerFocusMap[p.id] = null;
            if (loadedGame.playerScores[p.id] === undefined) loadedGame.playerScores[p.id] = 0;
            if (loadedGame.playerComboCounts[p.id] === undefined) loadedGame.playerComboCounts[p.id] = 0;
        });
        if (loadedGame.totalGameLives === undefined) loadedGame.totalGameLives = MAX_GAME_LIVES; // Ensure it's initialized

        if (!loadedGame.history) loadedGame.history = [];
        if (!loadedGame.completedUnits) loadedGame.completedUnits = { boxes: new Set(), rows: new Set(), cols: new Set() };
        else { 
            loadedGame.completedUnits.boxes = new Set(Array.from(loadedGame.completedUnits.boxes || []));
            loadedGame.completedUnits.rows = new Set(Array.from(loadedGame.completedUnits.rows || []));
            loadedGame.completedUnits.cols = new Set(Array.from(loadedGame.completedUnits.cols || []));
        }
        if (!loadedGame.gameOutcome) loadedGame.gameOutcome = 'inprogress';
        setGameState(loadedGame);
      } else {
        alert('Game not found!');
        navigate('/');
      }
    };
    loadGame();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `sudokuGame_${gameId}`) {
        if (event.newValue) {
          try {
            const updatedGame = JSON.parse(event.newValue) as GameState;
              updatedGame.players = updatedGame.players.map(p => ({...p, lastActivityTimestamp: p.lastActivityTimestamp || Date.now() }));
              updatedGame.players.forEach(p => { 
                if (!(p.id in updatedGame.playerFocusMap)) updatedGame.playerFocusMap[p.id] = null;
                if (updatedGame.playerScores[p.id] === undefined) updatedGame.playerScores[p.id] = 0;
                if (updatedGame.playerComboCounts[p.id] === undefined) updatedGame.playerComboCounts[p.id] = 0;
              });
              if (updatedGame.totalGameLives === undefined) updatedGame.totalGameLives = MAX_GAME_LIVES;

              if (!updatedGame.history) updatedGame.history = [];
              if (!updatedGame.completedUnits) updatedGame.completedUnits = { boxes: new Set(), rows: new Set(), cols: new Set() };
              else {
                  updatedGame.completedUnits.boxes = new Set(Array.from(updatedGame.completedUnits.boxes || []));
                  updatedGame.completedUnits.rows = new Set(Array.from(updatedGame.completedUnits.rows || []));
                  updatedGame.completedUnits.cols = new Set(Array.from(updatedGame.completedUnits.cols || []));
              }
              if (!updatedGame.gameOutcome) updatedGame.gameOutcome = 'inprogress';
            setGameState(updatedGame);
          } catch (e) { console.error("Error parsing game state from storage", e); }
        } else { 
          alert('Game data was removed or an error occurred.');
          navigate('/');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [gameId, navigate, localPlayer]);

  useEffect(() => {
    if (!gameState || gameState.isGameOver || !gameState.startTime || isPaused) {
      if (gameState?.isGameOver && gameState.startTime && gameState.endTime) {
         const diff = Math.floor((gameState.endTime - gameState.startTime) / 1000);
         const minutes = Math.floor(diff / 60);
         const seconds = diff % 60;
         setElapsedTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      } else if (!gameState?.startTime) {
        setElapsedTime("00:00");
      }
      return;
    }
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - gameState.startTime!) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsedTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, isPaused]);


  const handleCellSelect = useCallback((r: number, c: number) => {
    setSelectedCell({ r, c });
    if (gameState && localPlayer && !gameState.isGameOver && gameState.totalGameLives > 0) {
      const newFocusMap = { ...gameState.playerFocusMap, [localPlayer.id]: {r, c} };
      const updatedPlayers = gameState.players.map(p => p.id === localPlayer.id ? {...p, lastActivityTimestamp: Date.now()} : p);
      updateGameState({...gameState, playerFocusMap: newFocusMap, players: updatedPlayers}); 
    }
  }, [gameState, localPlayer, updateGameState]);

  const handleCellValueChange = useCallback((r: number, c: number, value: number | null) => {
    if (!gameState || !localPlayer || gameState.isGameOver || gameState.totalGameLives <= 0) {
       if (gameState && localPlayer && gameState.totalGameLives <= 0 && !gameState.isGameOver) {
           setMessage(`Game Over - No lives left! Cannot make moves.`);
       }
      return;
    }
    if (!gameState.players.find(p => p.id === localPlayer.id)) {
        setMessage("You are viewing this game. Only participants can make changes.");
        return;
    }
    if (gameState.currentBoard[r][c].isOriginal) return;

    const newBoard = gameState.currentBoard.map(row => row.map(cell => ({ ...cell })));
    const oldCellValue = newBoard[r][c].value;
    newBoard[r][c].value = value;
    newBoard[r][c].lastModifiedBy = localPlayer.id;

    let currentScore = gameState.playerScores[localPlayer.id] || 0;
    let currentCombo = gameState.playerComboCounts[localPlayer.id] || 0;
    let currentGameLives = gameState.totalGameLives;
    let gameMessageUpdate = "";

    const isMoveCorrect = value !== null && gameState.solution[r][c] === value;
    
    newBoard[r][c].isInvalid = value !== null && !isMoveCorrect; 

    let newGameState = { ...gameState, currentBoard: newBoard, lastModifierId: localPlayer.id };
    newGameState.players = newGameState.players.map(p => p.id === localPlayer.id ? {...p, lastActivityTimestamp: Date.now()} : p);


    if (value !== null) { 
      if (isMoveCorrect) {
        triggerCellAnimation(r,c, 'correct');
        currentScore += POINTS_CORRECT_MOVE;
        currentCombo++;
        if (currentCombo > 1) {
          const comboBonus = (currentCombo - 1) * POINTS_COMBO_BASE;
          currentScore += comboBonus;
          gameMessageUpdate = `Combo x${currentCombo}! +${POINTS_CORRECT_MOVE + comboBonus} pts. `;
        } else {
          gameMessageUpdate = `Correct! +${POINTS_CORRECT_MOVE} pts. `;
        }

        const boxR = Math.floor(r / BOX_SIZE); const boxC = Math.floor(c / BOX_SIZE);
        const boxId = `box-${boxR}-${boxC}`;
        if (!newGameState.completedUnits.boxes.has(boxId)) {
          let boxComplete = true;
          for (let i = boxR * BOX_SIZE; i < (boxR + 1) * BOX_SIZE; i++) {
            for (let j = boxC * BOX_SIZE; j < (boxC + 1) * BOX_SIZE; j++) {
              if (newBoard[i][j].value === null || newBoard[i][j].value !== newGameState.solution[i][j]) {
                boxComplete = false; break;
              }
            } if (!boxComplete) break;
          }
          if (boxComplete) { currentScore += POINTS_BOX_COMPLETE; newGameState.completedUnits.boxes.add(boxId); gameMessageUpdate += `Box Complete! +${POINTS_BOX_COMPLETE} pts. `; }
        }
        const rowId = `row-${r}`;
        if (!newGameState.completedUnits.rows.has(rowId)) {
          let rowComplete = true;
          for (let j = 0; j < GRID_SIZE; j++) { if (newBoard[r][j].value === null || newBoard[r][j].value !== newGameState.solution[r][j]) { rowComplete = false; break; }}
          if (rowComplete) { currentScore += POINTS_ROW_COMPLETE; newGameState.completedUnits.rows.add(rowId); gameMessageUpdate += `Row Complete! +${POINTS_ROW_COMPLETE} pts. `; }
        }
        const colId = `col-${c}`;
        if (!newGameState.completedUnits.cols.has(colId)) {
          let colComplete = true;
          for (let i = 0; i < GRID_SIZE; i++) { if (newBoard[i][c].value === null || newBoard[i][c].value !== newGameState.solution[i][c]) { colComplete = false; break; }}
          if (colComplete) { currentScore += POINTS_COLUMN_COMPLETE; newGameState.completedUnits.cols.add(colId); gameMessageUpdate += `Column Complete! +${POINTS_COLUMN_COMPLETE} pts. `; }
        }
        setMessage(gameMessageUpdate.trim());
      } else { 
        triggerCellAnimation(r,c,'incorrect');
        currentCombo = 0;
        currentGameLives--; // Decrement total game lives
        gameMessageUpdate = `Incorrect move. Game lives left: ${currentGameLives}.`;
        setMessage(gameMessageUpdate);
      }
    } else { 
        currentCombo = 0; 
        setMessage("Cell erased.");
    }

    newGameState.playerScores[localPlayer.id] = currentScore;
    newGameState.playerComboCounts[localPlayer.id] = currentCombo;
    newGameState.totalGameLives = currentGameLives; // Update total game lives in state

    if (!newGameState.startTime && value !== null && isMoveCorrect && !isPaused) {
        newGameState.startTime = Date.now();
    }
    
    const boardSolved = isBoardSolved(newBoard, newGameState.solution);
    if (boardSolved) {
        newGameState.isGameOver = true;
        newGameState.endTime = Date.now();
        newGameState.gameOutcome = 'solved';
        newGameState.gameWinnerId = localPlayer.id; // Still credit the player making the winning move
        setMessage(`Sudoku Solved by ${localPlayer.name}! Final Score: ${currentScore}.`);
    } else if (newGameState.totalGameLives <= 0) { // Check if total game lives are depleted
        newGameState.isGameOver = true;
        newGameState.endTime = Date.now();
        newGameState.gameOutcome = 'failed';
        setMessage("Game Over - All lives used up!");
    }
    updateGameState(newGameState, {addToHistory: oldCellValue !== value, moveDetails: {r,c,value}});
  }, [gameState, localPlayer, updateGameState, isPaused, setMessage, selectedCell]);

  const handleNumberPress = useCallback((num: number | null) => {
    if (selectedCell && gameState && !gameState.isGameOver && localPlayer && gameState.totalGameLives > 0) {
       if (!gameState.players.find(p => p.id === localPlayer.id)) {
         setMessage("Viewing only. Cannot make changes.");
         return;
      }
      handleCellValueChange(selectedCell.r, selectedCell.c, num);
    } else if (gameState && gameState.totalGameLives <= 0) {
        setMessage(`Game Over - No lives left!`);
    } else if (!selectedCell) {
        setMessage("Please select a cell first.");
    }
  }, [selectedCell, gameState, localPlayer, handleCellValueChange]);
  
  const handleValidate = () => {
    if (!gameState || !localPlayer || gameState.totalGameLives <= 0) return;
    if (!gameState.players.find(p => p.id === localPlayer.id)) {
        setMessage("Viewing only. Cannot validate.");
        return;
    }
    let incorrectCount = 0;
    const newBoard = gameState.currentBoard.map((row, rIdx) => 
      row.map((cell, cIdx) => {
        const isActuallyIncorrect = cell.value !== null && !cell.isOriginal && cell.value !== gameState.solution[rIdx][cIdx];
        if (isActuallyIncorrect) incorrectCount++;
        return {
          ...cell,
          isInvalid: isActuallyIncorrect 
        };
      })
    );
    const updatedPlayers = gameState.players.map(p => p.id === localPlayer.id ? {...p, lastActivityTimestamp: Date.now()} : p);
    updateGameState({...gameState, currentBoard: newBoard, players: updatedPlayers, lastModifierId: localPlayer.id}); 
    setMessage(incorrectCount > 0 ? `${incorrectCount} number(s) are incorrect and highlighted.` : "All filled numbers match the solution so far!");
  };

  const handleSolve = () => {
     if (!gameState || !localPlayer) return;
      if (!gameState.isGameOver && !gameState.players.find(p => p.id === localPlayer.id)) {
        setMessage("Only participants can reveal solution for an ongoing game.");
        return;
    }
     const solvedBoard = gameState.solution.map((row, rIdx) => 
        row.map((val, cIdx) => ({
            value: val,
            isOriginal: gameState.initialBoard[rIdx][cIdx] === val, 
            isInvalid: false,
            lastModifiedBy: gameState.currentBoard[rIdx][cIdx].isOriginal ? undefined : (gameState.currentBoard[rIdx][cIdx].lastModifiedBy || 'solved'),
            noteNumbers: []
        }))
     );
     const updatedPlayers = gameState.players.map(p => p.id === localPlayer.id ? {...p, lastActivityTimestamp: Date.now()} : p);
     updateGameState({
        ...gameState, 
        currentBoard: solvedBoard, 
        isGameOver: true, 
        endTime: gameState.endTime || Date.now(), 
        gameOutcome: gameState.gameOutcome === 'inprogress' ? 'failed' : gameState.gameOutcome, 
        gameWinnerId: undefined, 
        players: updatedPlayers,
        lastModifierId: localPlayer.id,
      });
     setMessage("Solution Revealed! Game Over.");
  };

  const handleHint = () => {
    if (!gameState || gameState.isGameOver || !localPlayer || hintCount <= 0 || gameState.totalGameLives <= 0) return;
    if (!gameState.players.find(p => p.id === localPlayer.id)) {
        setMessage("Viewing only. Cannot use hints.");
        return;
    }
    const emptyCells: {r: number, c: number}[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (gameState.currentBoard[r][c].value === null) {
                emptyCells.push({r, c});
            }
        }
    }
    if (emptyCells.length === 0) {
        setMessage("Board is full, no hints needed!");
        return;
    }
    const randomEmptyCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const correctValue = gameState.solution[randomEmptyCell.r][randomEmptyCell.c];
    
    triggerCellAnimation(randomEmptyCell.r, randomEmptyCell.c, 'hint');
    const updatedPlayers = gameState.players.map(p => p.id === localPlayer.id ? {...p, lastActivityTimestamp: Date.now()} : p);
    setGameState(gs => gs ? {...gs, players: updatedPlayers, lastModifierId: localPlayer.id} : null); 

    handleCellValueChange(randomEmptyCell.r, randomEmptyCell.c, correctValue); 
    
    if (gameState.totalGameLives > 0 && !isBoardSolved(gameState.currentBoard, gameState.solution)) {
         setMessage(`Hint Used! Cell R${randomEmptyCell.r+1}C${randomEmptyCell.c+1} is ${correctValue}. Hints left: ${hintCount - 1}`);
    }

    setHintCount(prev => prev - 1);
    setSelectedCell({r: randomEmptyCell.r, c: randomEmptyCell.c}); 
  };

  const handlePauseToggle = () => {
    if (!gameState || gameState.isGameOver) return;
    if (!gameState.startTime && !isPaused) { 
        updateGameState({...gameState, startTime: Date.now() });
    }
    setIsPaused(prev => !prev);
    setMessage(isPaused ? "Game Resumed." : "Game Paused.");
  };

  const handleToggleNotesMode = () => {
    setIsNotesMode(prev => !prev);
    setMessage(isNotesMode ? "Notes Mode OFF." : "Notes Mode ON. Click cells to toggle candidate numbers (visual only).");
  };

  const handleUndo = () => {
    if (!gameState || !localPlayer || gameState.isGameOver || gameState.totalGameLives <= 0 ) return;
    if (!gameState.players.find(p => p.id === localPlayer.id)) {
        setMessage("Viewing only. Cannot undo.");
        return;
    }
    if (!gameState.history || gameState.history.length === 0) {
        setMessage("No moves to undo.");
        return;
    }

    const newHistory = [...gameState.history];
    const lastStateEntry = newHistory.pop();
    
    if (lastStateEntry) {
      // Reset combo for the player who made the move being undone.
      // Lives are NOT restored on undo.
      const playerWhoMadeTheMoveId = lastStateEntry.player;
      const newPlayerComboCounts = {...gameState.playerComboCounts, [playerWhoMadeTheMoveId]: 0};
            
      const updatedPlayers = gameState.players.map(p => p.id === localPlayer.id ? {...p, lastActivityTimestamp: Date.now()} : p);

      updateGameState({ ...gameState, currentBoard: lastStateEntry.board, history: newHistory, playerComboCounts: newPlayerComboCounts, players: updatedPlayers, lastModifierId: localPlayer.id });
      setMessage("Last move undone. Player's combo reset. Game lives are not restored.");
      if (lastStateEntry.move && lastStateEntry.move.r !== -1) {
          setSelectedCell({r: lastStateEntry.move.r, c: lastStateEntry.move.c});
      }
    }
  };

  // Hücre animasyonlarını tetikleyen fonksiyon (GamePage içinde tekrar tanımlandı)
  const triggerCellAnimation = (r: number, c: number, type: 'correct' | 'incorrect' | 'hint' | 'selected') => {
    setAnimatedCellKey(`${r}-${c}-${type}-${Date.now()}`);
  };

  if (!gameState || !localPlayer) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
            <div className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Loading game...</div>
            <svg className="animate-spin h-8 w-8 text-indigo-500 mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }
  
  const canInteract = !!gameState.players.find(p => p.id === localPlayer.id) && !gameState.isGameOver && gameState.totalGameLives > 0;
  const currentPlayerDisplayStats: CurrentPlayerDisplayStats = {
    score: gameState.playerScores[localPlayer.id] || 0,
    combo: gameState.playerComboCounts[localPlayer.id] || 0,
  };


  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-100">
      <TopInfoBar
        difficulty={gameState.difficulty}
        currentPlayerStats={currentPlayerDisplayStats}
        totalGameLives={gameState.totalGameLives}
        time={elapsedTime}
        isPaused={isPaused}
        onPauseToggle={handlePauseToggle}
        gameMessage={message}
        gameOutcome={gameState.gameOutcome}
        winnerName={gameState.gameWinnerId ? gameState.players.find(p=>p.id === gameState.gameWinnerId)?.name : undefined}
      />

      <div className="flex flex-1 flex-col md:flex-row w-full max-w-7xl mx-auto p-2 sm:p-4 overflow-hidden">
        <PlayerSidebar 
            players={gameState.players}
            playerScores={gameState.playerScores}
            // playerLives prop removed
            currentPlayerId={localPlayer.id}
            lastModifierId={gameState.lastModifierId}
            className="w-full md:w-64 lg:w-72 md:mr-4 mb-4 md:mb-0 flex-shrink-0 animate-fadeIn-delay-1"
        />
        <main className="flex-grow flex flex-col items-center justify-center animate-fadeIn">
            <SudokuBoard
            grid={gameState.currentBoard}
            selectedCell={selectedCell}
            onCellSelect={handleCellSelect}
            onCellValueChange={handleCellValueChange} 
            players={gameState.players}
            playerFocusMap={gameState.playerFocusMap}
            currentUserId={localPlayer.id}
            isNotesMode={isNotesMode}
            animatedCellKey={animatedCellKey}
            />
        </main>
      </div>
      
      <BottomControls
        onNumberPress={handleNumberPress}
        onUndo={handleUndo}
        onErase={() => selectedCell ? handleNumberPress(null) : setMessage("Select a cell to erase.")}
        onToggleNotesMode={handleToggleNotesMode}
        onHint={handleHint}
        isNotesMode={isNotesMode}
        remainingHints={hintCount}
        canUndo={!!(gameState.history && gameState.history.length > 0 && canInteract)}
        onValidate={canInteract ? handleValidate : undefined}
        onSolve={ (canInteract || (gameState.isGameOver && gameState.gameOutcome !== 'solved')) ? handleSolve : undefined} 
        canInteract={canInteract}
        disabled={gameState.isGameOver || isPaused || !canInteract } // Simplified disabled logic based on canInteract
      />
    </div>
  );
};


function App() {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const storedPlayer = getLocalStorageItem<Player>('sudokuCurrentPlayer');
    if (storedPlayer) {
      setCurrentPlayer(storedPlayer);
    }
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);


  return (
    <div className="app-container bg-slate-100 dark:bg-slate-900 min-h-screen">
       <button 
        onClick={() => navigate('/')}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg shadow-md z-20 transition-all duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
        style={{ display: location.pathname === '/' ? 'none' : 'block' }}
        aria-label="Go to Home Page"
      >
        Home
      </button>
      <Routes>
        <Route path="/" element={<HomePage setCurrentPlayer={setCurrentPlayer} currentPlayer={currentPlayer} />} />
        <Route path="/game/:gameId" element={<GamePage currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} />} />
      </Routes>
    </div>
  );
}

export default App;

// --- Set <-> Array Dönüşüm Fonksiyonları ---
function serializeGameState(gameState: GameState): any {
  return {
    ...gameState,
    completedUnits: {
      boxes: Array.from(gameState.completedUnits.boxes),
      rows: Array.from(gameState.completedUnits.rows),
      cols: Array.from(gameState.completedUnits.cols),
    },
  };
}
function deserializeGameState(data: any): GameState {
  return {
    ...data,
    completedUnits: {
      boxes: new Set(data.completedUnits?.boxes || []),
      rows: new Set(data.completedUnits?.rows || []),
      cols: new Set(data.completedUnits?.cols || []),
    },
  };
}
