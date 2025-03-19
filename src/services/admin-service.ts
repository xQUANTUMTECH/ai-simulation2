import { supabase } from './supabase';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermission {
  role: string;
  permissions: Permission[];
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

class AdminService {
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getRolePermissions(role: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        admin_permissions (*)
      `)
      .eq('role', role);

    if (error) throw error;
    return data.map(d => d.admin_permissions);
  }

  async updateRolePermissions(role: string, permissionIds: string[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role);

    if (deleteError) throw deleteError;

    if (permissionIds.length > 0) {
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(
          permissionIds.map(id => ({
            role,
            permission_id: id,
            granted_by: (await supabase.auth.getUser()).data.user?.id
          }))
        );

      if (insertError) throw insertError;
    }
  }

  async logAdminAction(action: string, entityType: string, entityId: string, changes?: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      });

    if (error) throw error;
  }

  async getAuditLog(options: {
    adminId?: string;
    entityType?: string;
    entityId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  } = {}): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.adminId) {
      query = query.eq('admin_id', options.adminId);
    }
    if (options.entityType) {
      query = query.eq('entity_type', options.entityType);
    }
    if (options.entityId) {
      query = query.eq('entity_id', options.entityId);
    }
    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate.toISOString());
    }
    if (options.toDate) {
      query = query.lte('created_at', options.toDate.toISOString());
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '0.0.0.0';
    }
  }

  async hasPermission(permission: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userRecord) return false;

    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('admin_permissions!inner(name)')
      .eq('role', userRecord.role);

    return permissions?.some(p => p.admin_permissions.name === permission) || false;
  }
}

export const adminService = new AdminService();