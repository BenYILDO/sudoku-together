import { supabase } from './supabaseClient';
import { GameState } from './types';

export async function createGame(gameId: string, data: GameState) {
  const { error } = await supabase
    .from('games')
    .insert([{ game_id: gameId, data }]);
  return error;
}

export async function getGame(gameId: string) {
  const { data, error } = await supabase
    .from('games')
    .select('data')
    .eq('game_id', gameId)
    .single();
  return { data: data?.data, error };
}

export async function updateGame(gameId: string, data: GameState) {
  const { error } = await supabase
    .from('games')
    .update({ data })
    .eq('game_id', gameId);
  return error;
} 