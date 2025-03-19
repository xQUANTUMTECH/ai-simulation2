import { supabase } from './supabase';

export interface Simulation {
  id: string;
  title: string;
  description: string;
  type: 'medical' | 'emergency' | 'surgical';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'active' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SimulationParticipant {
  id: string;
  simulation_id: string;
  user_id: string;
  role: 'observer' | 'participant' | 'instructor';
  joined_at: string;
  left_at?: string;
}

export interface SimulationMetric {
  id: string;
  simulation_id: string;
  participant_id: string;
  metric_type: 'communication' | 'decision_making' | 'technical_skill';
  score: number;
  feedback?: string;
  recorded_at: string;
}

class SimulationService {
  async createSimulation(simulation: Omit<Simulation, 'id' | 'created_at' | 'updated_at'>): Promise<Simulation> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('simulations')
      .insert(simulation)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSimulations(): Promise<Simulation[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async joinSimulation(simulationId: string, role: SimulationParticipant['role']): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('simulation_participants')
      .insert({
        simulation_id: simulationId,
        user_id: user.id,
        role
      });

    if (error) throw error;
  }

  async leaveSimulation(simulationId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('simulation_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('simulation_id', simulationId)
      .eq('user_id', user.id)
      .is('left_at', null);

    if (error) throw error;
  }

  async recordMetric(metric: Omit<SimulationMetric, 'id' | 'recorded_at'>): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('simulation_metrics')
      .insert(metric);

    if (error) throw error;
  }

  async getSimulationMetrics(simulationId: string): Promise<SimulationMetric[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('simulation_metrics')
      .select('*')
      .eq('simulation_id', simulationId)
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getParticipantMetrics(participantId: string): Promise<SimulationMetric[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('simulation_metrics')
      .select('*')
      .eq('participant_id', participantId)
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateSimulationStatus(simulationId: string, status: Simulation['status']): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('simulations')
      .update({ status })
      .eq('id', simulationId);

    if (error) throw error;
  }
}

export const simulationService = new SimulationService();