import { supabase } from './supabase';

// Custom EventEmitter implementation for browser
class EventEmitter {
  private listeners: Map<string, ((notification: Notification) => void)[]> = new Map();

  on(event: string, callback: (notification: Notification) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.forEach(callback => callback(data));
    }
  }

  removeListener(event: string, callback: (notification: Notification) => void) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        this.listeners.set(event, callbacks.filter(cb => cb !== callback));
      }
    }
  }
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  notification_type: 'COURSE' | 'QUIZ' | 'CERTIFICATE' | 'SYSTEM';
  related_id?: string;
  created_at: string;
  updated_at: string;
}

class NotificationService extends EventEmitter {
  private listeners: Map<string, (notification: Notification) => void> = new Map();

  constructor() {
    super();
    this.setupRealtimeSubscription();
  }

  private setupRealtimeSubscription() {
    if (!supabase) return;

    supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const notification = payload.new as Notification;
          this.notifyListeners(notification);
        }
      )
      .subscribe();
  }

  private notifyListeners(notification: Notification) {
    this.listeners.forEach(listener => listener(notification));
  }

  subscribe(key: string, callback: (notification: Notification) => void) {
    this.listeners.set(key, callback);
  }

  unsubscribe(key: string) {
    this.listeners.delete(key);
  }

  async getNotifications(limit = 50): Promise<Notification[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getUnreadCount(): Promise<number> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  }

  async markAsRead(notificationId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  }

  async markAllAsRead(): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('read', false);

    if (error) throw error;
  }

  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'read'>): Promise<Notification> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  async updateNotificationSettings(settings: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    in_app_notifications?: boolean;
    notification_types?: string[];
    quiet_hours?: { start: string | null; end: string | null };
  }): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
  }

  async getNotificationSettings(): Promise<{
    email_notifications: boolean;
    push_notifications: boolean;
    in_app_notifications: boolean;
    notification_types: string[];
    quiet_hours: { start: string | null; end: string | null };
  }> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || {
      email_notifications: true,
      push_notifications: true,
      in_app_notifications: true,
      notification_types: ['COURSE', 'QUIZ', 'CERTIFICATE', 'SYSTEM'],
      quiet_hours: { start: null, end: null }
    };
  }
}

export const notificationService = new NotificationService();