import { supabase } from './supabase';
import { activityService } from './activity-service';

// Tipi di avvisi supportati
export type AlertType = 'info' | 'warning' | 'error' | 'success';

// Livelli di priorità per gli avvisi
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

// Categorie di avvisi
export type AlertCategory = 
  | 'system' 
  | 'security' 
  | 'performance' 
  | 'storage' 
  | 'network' 
  | 'application' 
  | 'database'
  | 'user'
  | 'content'
  | 'ai';

// Definizione dell'interfaccia per gli avvisi
export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  details?: Record<string, any>;
  category: AlertCategory;
  priority: AlertPriority;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  auto_resolve?: boolean;
  resolve_by?: string; // Data di scadenza per la risoluzione
  assigned_to?: string; // ID utente assegnato alla risoluzione
  source?: string; // Origine dell'avviso (servizio, componente, etc.)
}

// Opzioni per filtrare gli avvisi
export interface AlertFilterOptions {
  types?: AlertType[];
  priorities?: AlertPriority[];
  categories?: AlertCategory[];
  resolved?: boolean;
  fromDate?: Date;
  toDate?: Date;
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Opzioni per la creazione di un avviso
export interface CreateAlertOptions {
  type: AlertType;
  message: string;
  details?: Record<string, any>;
  category: AlertCategory;
  priority: AlertPriority;
  auto_resolve?: boolean;
  resolve_by?: Date;
  assigned_to?: string;
  source?: string;
}

class AlertService {
  /**
   * Crea un nuovo avviso nel sistema
   */
  async createAlert(options: CreateAlertOptions): Promise<Alert | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: result, error } = await supabase
      .from('system_alerts')
      .insert({
        type: options.type,
        message: options.message,
        details: options.details || {},
        category: options.category,
        priority: options.priority,
        auto_resolve: options.auto_resolve || false,
        resolve_by: options.resolve_by?.toISOString(),
        assigned_to: options.assigned_to,
        source: options.source
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return null;
    }

    // Registra anche un'attività relativa a questo avviso
    await activityService.logActivity({
      type: 'alert',
      message: `[${options.priority.toUpperCase()}] ${options.message}`,
      details: { alertId: result.id, alertType: options.type, category: options.category },
      importance: this.mapPriorityToImportance(options.priority)
    });

    return result;
  }

  /**
   * Ottiene gli avvisi con opzioni di filtro
   */
  async getAlerts(options: AlertFilterOptions = {}): Promise<Alert[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    let query = supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    // Applica i filtri
    if (options.types && options.types.length > 0) {
      query = query.in('type', options.types);
    }

    if (options.priorities && options.priorities.length > 0) {
      query = query.in('priority', options.priorities);
    }

    if (options.categories && options.categories.length > 0) {
      query = query.in('category', options.categories);
    }

    if (options.resolved !== undefined) {
      if (options.resolved) {
        query = query.not('resolved_at', 'is', null);
      } else {
        query = query.is('resolved_at', null);
      }
    }

    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate.toISOString());
    }

    if (options.toDate) {
      query = query.lte('created_at', options.toDate.toISOString());
    }

    if (options.assignedTo) {
      query = query.eq('assigned_to', options.assignedTo);
    }

    if (options.search) {
      query = query.ilike('message', `%${options.search}%`);
    }

    // Paginazione
    query = query.limit(options.limit || 20);
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Ottiene un avviso specifico per ID
   */
  async getAlertById(alertId: string): Promise<Alert | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error) {
      console.error('Error fetching alert by ID:', error);
      return null;
    }

    return data;
  }

  /**
   * Risolve un avviso
   */
  async resolveAlert(alertId: string, userId: string, notes?: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Prima ottieni l'avviso esistente per avere i dettagli correnti
    const { data: currentAlert } = await supabase
      .from('system_alerts')
      .select('details')
      .eq('id', alertId)
      .single();
      
    // Aggiorna i dettagli con le note di risoluzione
    const updatedDetails = {
      ...(currentAlert?.details || {}),
      resolution_notes: notes || null
    };
    
    const { error } = await supabase
      .from('system_alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        details: updatedDetails
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error resolving alert:', error);
      return false;
    }

    // Registra attività di risoluzione
    await activityService.logActivity({
      type: 'system',
      message: `Avviso ID:${alertId} risolto da ${userId}`,
      user_id: userId,
      related_id: alertId,
      importance: 'medium'
    });

    return true;
  }

  /**
   * Assegna un avviso ad un utente
   */
  async assignAlert(alertId: string, assignedTo: string, assignedBy: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Prima ottieni l'avviso esistente per avere i dettagli correnti
    const { data: currentAlert } = await supabase
      .from('system_alerts')
      .select('details')
      .eq('id', alertId)
      .single();
      
    // Aggiorna i dettagli con le informazioni di assegnazione
    const updatedDetails = {
      ...(currentAlert?.details || {}),
      assigned_by: assignedBy
    };
    
    const { error } = await supabase
      .from('system_alerts')
      .update({
        assigned_to: assignedTo,
        details: updatedDetails
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error assigning alert:', error);
      return false;
    }

    return true;
  }

  /**
   * Verifica e risolve automaticamente gli avvisi impostati con auto_resolve
   * Da eseguire periodicamente tramite un job pianificato
   */
  async checkAutoResolveAlerts(): Promise<number> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Trova avvisi con auto_resolve che hanno raggiunto la data di resolve_by
    const { data, error } = await supabase
      .from('system_alerts')
      .select('id')
      .eq('auto_resolve', true)
      .is('resolved_at', null)
      .not('resolve_by', 'is', null)
      .lte('resolve_by', new Date().toISOString());

    if (error) {
      console.error('Error checking for auto-resolve alerts:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const alertIds = data.map(alert => alert.id);
    
    // Ottieni prima i dettagli correnti degli avvisi
    const { data: currentAlerts } = await supabase
      .from('system_alerts')
      .select('id, details')
      .in('id', alertIds);
    
    // Prepara gli aggiornamenti per ciascun avviso
    const updates = (currentAlerts || []).map(alert => ({
      id: alert.id,
      resolved_at: new Date().toISOString(),
      details: {
        ...(alert.details || {}),
        auto_resolved: true
      }
    }));
    
    // Risolvi gli avvisi con i dettagli aggiornati
    const { error: updateError } = await supabase
      .from('system_alerts')
      .upsert(updates);

    if (updateError) {
      console.error('Error auto-resolving alerts:', updateError);
      return 0;
    }

    return alertIds.length;
  }

  /**
   * Ottiene il conteggio di avvisi attivi per categoria
   */
  async getActiveAlertCounts(): Promise<Record<AlertCategory, number>> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('system_alerts')
      .select('category')
      .is('resolved_at', null);

    if (error) {
      console.error('Error fetching active alert counts:', error);
      return {} as Record<AlertCategory, number>;
    }

    const counts: Partial<Record<AlertCategory, number>> = {};
    
    data.forEach(alert => {
      const category = alert.category as AlertCategory;
      counts[category] = (counts[category] || 0) + 1;
    });

    // Assicurati che tutte le categorie esistano con un valore predefinito
    const categories: AlertCategory[] = [
      'system', 'security', 'performance', 'storage', 
      'network', 'application', 'database', 'user', 
      'content', 'ai'
    ];
    
    categories.forEach(category => {
      counts[category] = counts[category] || 0;
    });

    return counts as Record<AlertCategory, number>;
  }

  /**
   * Mappa priorità degli avvisi a livelli di importanza per le attività
   */
  private mapPriorityToImportance(priority: AlertPriority): 'low' | 'medium' | 'high' {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
      default:
        return 'low';
    }
  }

  /**
   * Ottiene un colore relativo al tipo di avviso
   */
  getAlertTypeColor(type: AlertType): string {
    switch (type) {
      case 'error':
        return '#ef4444'; // Rosso
      case 'warning':
        return '#f59e0b'; // Giallo
      case 'success':
        return '#10b981'; // Verde
      case 'info':
      default:
        return '#3b82f6'; // Blu
    }
  }

  /**
   * Ottiene un colore relativo alla priorità dell'avviso
   */
  getAlertPriorityColor(priority: AlertPriority): string {
    switch (priority) {
      case 'critical':
        return '#7f1d1d'; // Rosso scuro
      case 'high':
        return '#dc2626'; // Rosso
      case 'medium':
        return '#f59e0b'; // Giallo
      case 'low':
      default:
        return '#3b82f6'; // Blu
    }
  }
}

export const alertService = new AlertService();
