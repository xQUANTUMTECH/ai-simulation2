import { supabase } from './supabase';

interface SecuritySettings {
  minimumPasswordLength: number;
  requireEmailConfirmation: boolean;
  allowMultipleSessions: boolean;
  sessionExpiryDays: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

class SecurityService {
  private settings: SecuritySettings = {
    minimumPasswordLength: 8,
    requireEmailConfirmation: true,
    allowMultipleSessions: true,
    sessionExpiryDays: 30,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30
  };

  async loadSettings(): Promise<void> {
    const { data, error } = await supabase
      ?.from('auth_settings')
      .select('security_settings')
      .single();

    if (error) throw error;
    if (data?.security_settings) {
      this.settings = data.security_settings;
    }
  }

  async validatePassword(password: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (password.length < this.settings.minimumPasswordLength) {
      errors.push(`Password must be at least ${this.settings.minimumPasswordLength} characters`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async checkAccountLockout(userId: string): Promise<{
    isLocked: boolean;
    remainingMinutes?: number;
  }> {
    const { data: user } = await supabase
      ?.from('users')
      .select('failed_login_count, locked_until')
      .eq('id', userId)
      .single();

    if (!user) return { isLocked: false };

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000
      );
      return { isLocked: true, remainingMinutes };
    }

    return { isLocked: false };
  }

  async recordLoginAttempt(userId: string, success: boolean): Promise<void> {
    if (success) {
      // Reset failed attempts on successful login
      await supabase?.from('users').update({
        failed_login_count: 0,
        locked_until: null,
        last_login: new Date().toISOString()
      }).eq('id', userId);
      return;
    }

    // Record failed attempt
    const { data: user } = await supabase
      ?.from('users')
      .select('failed_login_count')
      .eq('id', userId)
      .single();

    const newCount = (user?.failed_login_count || 0) + 1;

    // Lock account if max attempts exceeded
    if (newCount >= this.settings.maxFailedAttempts) {
      await supabase?.from('users').update({
        failed_login_count: newCount,
        locked_until: new Date(Date.now() + this.settings.lockoutDurationMinutes * 60000).toISOString()
      }).eq('id', userId);
    } else {
      await supabase?.from('users').update({
        failed_login_count: newCount
      }).eq('id', userId);
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const { data: session } = await supabase
      ?.from('auth_sessions')
      .select('expires_at, is_valid')
      .eq('id', sessionId)
      .single();

    if (!session) return false;

    // Check if session is valid and not expired
    return session.is_valid && new Date(session.expires_at) > new Date();
  }

  async createSession(userId: string, deviceInfo: any): Promise<string> {
    // Delete old sessions if multiple sessions not allowed
    if (!this.settings.allowMultipleSessions) {
      await supabase
        ?.from('auth_sessions')
        .update({ is_valid: false })
        .eq('user_id', userId);
    }

    // Create new session
    const { data, error } = await supabase
      ?.from('auth_sessions')
      .insert({
        user_id: userId,
        device_info: deviceInfo,
        expires_at: new Date(Date.now() + this.settings.sessionExpiryDays * 86400000).toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await supabase
      ?.from('auth_sessions')
      .update({ is_valid: false })
      .eq('id', sessionId);
  }

  async logSecurityEvent(
    userId: string,
    eventType: string,
    details: any
  ): Promise<void> {
    await supabase?.from('admin_audit_log').insert({
      admin_id: userId,
      action: eventType,
      entity_type: 'security',
      changes: details
    });
  }
}

export const securityService = new SecurityService();