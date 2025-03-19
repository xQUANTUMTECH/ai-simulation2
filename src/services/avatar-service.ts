import { supabase } from './supabase';
import { aiService } from './ai-service';

export interface AvatarTemplate {
  id: string;
  name: string;
  role: string;
  specialization?: string;
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  capabilities: string[];
  base_prompt: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AvatarInstance {
  id: string;
  template_id: string;
  name: string;
  status: 'active' | 'inactive' | 'learning' | 'error';
  current_simulation?: string;
  learning_data: any;
  interaction_count: number;
  last_active?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AvatarBehavior {
  id: string;
  avatar_id: string;
  trigger_type: 'event' | 'state' | 'interaction' | 'time' | 'condition';
  trigger_condition: any;
  response_type: 'speech' | 'action' | 'emotion' | 'decision';
  response_data: any;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AvatarInteraction {
  id: string;
  avatar_id: string;
  simulation_id: string;
  interaction_type: 'dialogue' | 'action' | 'decision' | 'observation';
  input?: string;
  response?: string;
  context: any;
  metrics: {
    accuracy?: number;
    appropriateness?: number;
    timing?: number;
  };
  created_at: string;
}

class AvatarService {
  async createTemplate(template: Omit<AvatarTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<AvatarTemplate> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('avatar_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createInstance(instance: Omit<AvatarInstance, 'id' | 'created_at' | 'updated_at' | 'interaction_count'>): Promise<AvatarInstance> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('avatar_instances')
      .insert(instance)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTemplates(): Promise<AvatarTemplate[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('avatar_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getInstance(instanceId: string): Promise<AvatarInstance> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('avatar_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateInstanceStatus(instanceId: string, status: AvatarInstance['status']): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('avatar_instances')
      .update({
        status,
        last_active: status === 'active' ? new Date().toISOString() : undefined
      })
      .eq('id', instanceId);

    if (error) throw error;
  }

  async addBehavior(behavior: Omit<AvatarBehavior, 'id' | 'created_at' | 'updated_at'>): Promise<AvatarBehavior> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('avatar_behaviors')
      .insert(behavior)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async recordInteraction(interaction: Omit<AvatarInteraction, 'id' | 'created_at'>): Promise<AvatarInteraction> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Record the interaction
    const { data, error } = await supabase
      .from('avatar_interactions')
      .insert(interaction)
      .select()
      .single();

    if (error) throw error;

    // Update interaction count
    await supabase
      .from('avatar_instances')
      .update({
        interaction_count: supabase.sql`interaction_count + 1`,
        last_active: new Date().toISOString()
      })
      .eq('id', interaction.avatar_id);

    return data;
  }

  async getAvatarBehaviors(avatarId: string): Promise<AvatarBehavior[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('avatar_behaviors')
      .select('*')
      .eq('avatar_id', avatarId)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAvatarInteractions(avatarId: string, limit = 50): Promise<AvatarInteraction[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('avatar_interactions')
      .select('*')
      .eq('avatar_id', avatarId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async generateResponse(
    avatarId: string,
    input: string,
    context: any
  ): Promise<{ response: string; metrics: AvatarInteraction['metrics'] }> {
    // Get avatar instance and behaviors
    const [instance, behaviors] = await Promise.all([
      this.getInstance(avatarId),
      this.getAvatarBehaviors(avatarId)
    ]);

    // Find matching behavior
    const matchingBehavior = behaviors.find(behavior => 
      this.matchesTriggerCondition(behavior.trigger_condition, input, context)
    );

    if (matchingBehavior) {
      return this.executeResponse(matchingBehavior, input, context);
    }

    // Default response generation
    return this.generateDefaultResponse(instance, input, context);
  }

  private matchesTriggerCondition(condition: any, input: string, context: any): boolean {
    // Implement trigger condition matching logic
    return false; // Placeholder
  }

  private async executeResponse(
    behavior: AvatarBehavior,
    input: string,
    context: any
  ): Promise<{ response: string; metrics: AvatarInteraction['metrics'] }> {
    // Execute behavior-specific response
    return {
      response: 'Behavior response', // Placeholder
      metrics: {
        accuracy: 0.9,
        appropriateness: 0.85,
        timing: 0.95
      }
    };
  }

  private async generateDefaultResponse(
    instance: AvatarInstance,
    input: string,
    context: any
  ): Promise<{ response: string; metrics: AvatarInteraction['metrics'] }> {
    // Generate default response using AI service
    return {
      response: 'Default response', // Placeholder
      metrics: {
        accuracy: 0.8,
        appropriateness: 0.8,
        timing: 0.9
      }
    };
  }
}

export const avatarService = new AvatarService();