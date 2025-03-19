import { supabase } from './supabase';

// Tipi di attività supportati
export type ActivityType = 'user' | 'course' | 'video' | 'document' | 'certificate' | 'alert' | 'admin' | 'system';

// Interfaccia per definire un'attività
export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  details?: Record<string, any>;
  user_id?: string;
  related_id?: string;
  importance: 'low' | 'medium' | 'high';
  created_at: string;
}

// Opzioni per filtrare le attività
export interface ActivityFilterOptions {
  types?: ActivityType[];
  importance?: ('low' | 'medium' | 'high')[];
  fromDate?: Date;
  toDate?: Date;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

class ActivityService {
  /**
   * Registra una nuova attività nel sistema
   */
  async logActivity(data: Omit<Activity, 'id' | 'created_at'>): Promise<Activity | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: result, error } = await supabase
      .from('activities')
      .insert({
        type: data.type,
        message: data.message,
        details: data.details || {},
        user_id: data.user_id,
        related_id: data.related_id,
        importance: data.importance
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      return null;
    }

    return result;
  }

  /**
   * Ottiene le attività recenti con opzioni di filtro
   */
  async getActivities(options: ActivityFilterOptions = {}): Promise<Activity[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    let query = supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });

    // Applica filtri
    if (options.types && options.types.length > 0) {
      query = query.in('type', options.types);
    }

    if (options.importance && options.importance.length > 0) {
      query = query.in('importance', options.importance);
    }

    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate.toISOString());
    }

    if (options.toDate) {
      query = query.lte('created_at', options.toDate.toISOString());
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.search) {
      query = query.ilike('message', `%${options.search}%`);
    }

    // Limit e offset per paginazione
    query = query.limit(options.limit || 20);
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Ottiene i dettagli di un'attività specifica
   */
  async getActivityDetails(activityId: string): Promise<Activity | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (error) {
      console.error('Error fetching activity details:', error);
      return null;
    }

    return data;
  }

  /**
   * Formatta il tempo relativo (es. "5 minuti fa")
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Ora';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} ${months === 1 ? 'mese' : 'mesi'} fa`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} ${years === 1 ? 'anno' : 'anni'} fa`;
    }
  }

  /**
   * Ottiene il conteggio delle attività non lette per un utente
   */
  async getUnreadActivitiesCount(userId: string): Promise<number> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { count, error } = await supabase
      .from('activity_reads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread activities count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Marca un'attività come letta per un utente
   */
  async markActivityAsRead(activityId: string, userId: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('activity_reads')
      .upsert({
        activity_id: activityId,
        user_id: userId,
        read: true,
        read_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error marking activity as read:', error);
      return false;
    }

    return true;
  }
}

export const activityService = new ActivityService();
