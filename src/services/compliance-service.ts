import { supabase } from './supabase';

interface ComplianceSettings {
  dataRetentionDays: number;
  requirePrivacyConsent: boolean;
  requireTermsAcceptance: boolean;
  gdprEnabled: boolean;
  dataExportEnabled: boolean;
  auditLoggingEnabled: boolean;
}

class ComplianceService {
  private settings: ComplianceSettings = {
    dataRetentionDays: 365,
    requirePrivacyConsent: true,
    requireTermsAcceptance: true,
    gdprEnabled: true,
    dataExportEnabled: true,
    auditLoggingEnabled: true
  };

  async loadSettings(): Promise<void> {
    const { data, error } = await supabase
      ?.from('auth_settings')
      .select('compliance_settings')
      .single();

    if (error) throw error;
    if (data?.compliance_settings) {
      this.settings = data.compliance_settings;
    }
  }

  async checkUserConsent(userId: string): Promise<{
    privacyAccepted: boolean;
    termsAccepted: boolean;
    lastAcceptedAt?: string;
  }> {
    const { data: user } = await supabase
      ?.from('users')
      .select('terms_accepted, terms_accepted_at')
      .eq('id', userId)
      .single();

    return {
      privacyAccepted: user?.terms_accepted || false,
      termsAccepted: user?.terms_accepted || false,
      lastAcceptedAt: user?.terms_accepted_at
    };
  }

  async recordUserConsent(
    userId: string,
    type: 'privacy' | 'terms',
    accepted: boolean
  ): Promise<void> {
    await supabase?.from('users').update({
      terms_accepted: accepted,
      terms_accepted_at: accepted ? new Date().toISOString() : null
    }).eq('id', userId);

    // Log consent
    await this.logComplianceEvent(userId, `${type}_consent`, {
      accepted,
      timestamp: new Date().toISOString()
    });
  }

  async exportUserData(userId: string): Promise<any> {
    if (!this.settings.dataExportEnabled) {
      throw new Error('Data export is not enabled');
    }

    // Get user profile
    const { data: profile } = await supabase
      ?.from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Get user activity
    const { data: activity } = await supabase
      ?.from('analytics')
      .select('*')
      .eq('user_id', userId);

    // Get user content
    const { data: content } = await supabase
      ?.from('documents')
      .select('*')
      .eq('created_by', userId);

    return {
      profile,
      activity,
      content,
      exportedAt: new Date().toISOString()
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // Mark account for deletion
    await supabase?.from('users').update({
      account_status: 'deleted',
      account_deletion_requested: true,
      account_deletion_requested_at: new Date().toISOString()
    }).eq('id', userId);

    // Log deletion request
    await this.logComplianceEvent(userId, 'data_deletion_request', {
      timestamp: new Date().toISOString()
    });
  }

  async cleanupExpiredData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.dataRetentionDays);

    // Clean up old analytics data
    await supabase
      ?.from('analytics')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    // Clean up old audit logs
    await supabase
      ?.from('admin_audit_log')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    // Log cleanup
    await this.logComplianceEvent('system', 'data_cleanup', {
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString()
    });
  }

  private async logComplianceEvent(
    userId: string,
    eventType: string,
    details: any
  ): Promise<void> {
    if (!this.settings.auditLoggingEnabled) return;

    await supabase?.from('admin_audit_log').insert({
      admin_id: userId,
      action: eventType,
      entity_type: 'compliance',
      changes: details
    });
  }
}

export const complianceService = new ComplianceService();