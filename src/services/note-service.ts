import { supabase } from './supabase';

export interface SimulationNote {
  id: string;
  user_id: string;
  simulation_id: string;
  content: string;
  type: 'observation' | 'feedback' | 'action';
  created_at: string;
  updated_at: string;
}

class NoteService {
  async createNote(note: Omit<SimulationNote, 'id' | 'created_at' | 'updated_at'>): Promise<SimulationNote> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('simulation_notes')
      .insert(note)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getNotes(simulationId: string): Promise<SimulationNote[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('simulation_notes')
      .select('*')
      .eq('simulation_id', simulationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateNote(noteId: string, content: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('simulation_notes')
      .update({ content })
      .eq('id', noteId);

    if (error) throw error;
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('simulation_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  }
}

export const noteService = new NoteService();