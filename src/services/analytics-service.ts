import { supabase } from './supabase';

export interface AnalyticsDashboard {
  id: string;
  title: string;
  description: string;
  layout: any;
  widgets: any[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AnalyticsMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  metadata?: any;
}

interface AnalyticsReport {
  id: string;
  title: string;
  metrics: AnalyticsMetric[];
  generatedAt: string;
}

export interface AnalyticsReport {
  id: string;
  title: string;
  description: string;
  query_definition: any;
  schedule?: string;
  last_run_at?: string;
  next_run_at?: string;
  recipients: string[];
  format: 'csv' | 'json' | 'pdf';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  description: string;
  query: string;
  category: string;
  refresh_interval?: string;
  last_refresh_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

class AnalyticsService {
  private async recordMetric(
    name: string,
    value: number,
    metadata?: any
  ): Promise<void> {
    try {
      await supabase?.from('analytics_metrics').insert({
        name,
        value,
        metadata,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  private async calculateTrend(
    currentValue: number,
    previousValue: number
  ): Promise<{ change: number; trend: 'up' | 'down' | 'stable' }> {
    if (!previousValue) return { change: 0, trend: 'stable' };
    
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      change,
      trend: change > 1 ? 'up' : change < -1 ? 'down' : 'stable'
    };
  }

  async generatePerformanceReport(): Promise<AnalyticsReport> {
    const metrics: AnalyticsMetric[] = [];
    
    // Get current values
    const { data: currentMetrics } = await supabase
      ?.from('analytics_metrics')
      .select('name, value')
      .order('created_at', { ascending: false })
      .limit(1);

    // Get previous values for comparison
    const { data: previousMetrics } = await supabase
      ?.from('analytics_metrics')
      .select('name, value')
      .order('created_at', { ascending: false })
      .offset(1)
      .limit(1);

    // Calculate trends
    for (const metric of currentMetrics || []) {
      const previousValue = previousMetrics?.find(m => m.name === metric.name)?.value;
      const { change, trend } = await this.calculateTrend(metric.value, previousValue || 0);
      
      metrics.push({
        name: metric.name,
        value: metric.value,
        change,
        trend
      });
    }

    return {
      id: crypto.randomUUID(),
      title: 'Performance Report',
      metrics,
      generatedAt: new Date().toISOString()
    };
  }

  async trackUserActivity(
    userId: string,
    activityType: string,
    details: any
  ): Promise<void> {
    try {
      await supabase?.from('analytics').insert({
        user_id: userId,
        event_type: activityType,
        event_data: details
      });
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }

  // Dashboard Management
  async createDashboard(dashboard: Omit<AnalyticsDashboard, 'id' | 'created_at' | 'updated_at'>): Promise<AnalyticsDashboard> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('analytics_dashboards')
      .insert(dashboard)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDashboards(): Promise<AnalyticsDashboard[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('analytics_dashboards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateDashboard(id: string, updates: Partial<AnalyticsDashboard>): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('analytics_dashboards')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  // Report Management
  async createReport(report: Omit<AnalyticsReport, 'id' | 'created_at' | 'updated_at'>): Promise<AnalyticsReport> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('analytics_reports')
      .insert(report)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getReports(): Promise<AnalyticsReport[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('analytics_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async runReport(reportId: string): Promise<string> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('analytics_exports')
      .insert({
        report_id: reportId,
        status: 'pending',
        format: 'csv'
      })
      .select()
      .single();

    if (exportError) throw exportError;

    // Get report query
    const { data: report } = await supabase
      .from('analytics_reports')
      .select('query_definition')
      .eq('id', reportId)
      .single();

    // Execute report query
    const { data: results, error: queryError } = await supabase
      .rpc('execute_report_query', {
        query_definition: report.query_definition
      });

    if (queryError) throw queryError;

    // Convert to CSV
    const csv = this.convertToCSV(results);

    // Upload to storage
    const fileName = `reports/${reportId}/${Date.now()}.csv`;
    const { error: uploadError } = await supabase.storage
      .from('analytics')
      .upload(fileName, csv);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('analytics')
      .getPublicUrl(fileName);

    // Update export record
    const { error: updateError } = await supabase
      .from('analytics_exports')
      .update({
        status: 'completed',
        file_url: publicUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', exportRecord.id);

    if (updateError) throw updateError;

    return publicUrl;
  }

  // Metric Management
  async createMetric(metric: Omit<AnalyticsMetric, 'id' | 'created_at' | 'updated_at'>): Promise<AnalyticsMetric> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('analytics_metrics')
      .insert(metric)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMetrics(): Promise<AnalyticsMetric[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('analytics_metrics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async refreshMetric(metricId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: metric } = await supabase
      .from('analytics_metrics')
      .select('query')
      .eq('id', metricId)
      .single();

    // Execute metric query
    const { error: queryError } = await supabase
      .rpc('execute_metric_query', {
        query_text: metric.query
      });

    if (queryError) throw queryError;

    // Update last refresh time
    const { error: updateError } = await supabase
      .from('analytics_metrics')
      .update({
        last_refresh_at: new Date().toISOString()
      })
      .eq('id', metricId);

    if (updateError) throw updateError;
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
      headers.map(header => 
        typeof obj[header] === 'object' ? JSON.stringify(obj[header]) : obj[header]
      )
    );

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

export const analyticsService = new AnalyticsService();