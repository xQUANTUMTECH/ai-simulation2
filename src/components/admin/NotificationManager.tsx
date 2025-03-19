import React, { useState, useEffect } from 'react';
import { 
  Bell, Edit, Trash2, Plus, Search, Filter,
  Mail, MessageSquare, Send, AlertTriangle, RefreshCw,
  Save, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Modal } from '../Modal';

interface NotificationManagerProps {
  isDarkMode: boolean;
}

interface Template {
  id: string;
  name: string;
  title_template: string;
  message_template: string;
  notification_type: string;
  email_subject: string;
  email_body: string;
  variables: string[];
}

export function NotificationManager({ isDarkMode }: NotificationManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState<string | null>(null);
  const [showTestTemplate, setShowTestTemplate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: Partial<Template>) => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .upsert({
          ...template,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await loadTemplates();
      setShowCreateTemplate(false);
      setShowEditTemplate(null);
      setSuccessMessage('Template saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      await loadTemplates();
      setSuccessMessage('Template deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting template');
    }
  };

  const handleTestTemplate = async (templateId: string) => {
    try {
      setIsSending(true);
      
      // Get template
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Replace variables in templates
      let title = template.title_template;
      let message = template.message_template;
      let emailSubject = template.email_subject;
      let emailBody = template.email_body;

      Object.entries(testVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        title = title.replace(regex, value);
        message = message.replace(regex, value);
        if (emailSubject) emailSubject = emailSubject.replace(regex, value);
        if (emailBody) emailBody = emailBody.replace(regex, value);
      });

      // Create test notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title,
          message,
          notification_type: template.notification_type
        });

      if (notifError) throw notifError;

      // Send test email if email templates exist
      if (emailSubject && emailBody) {
        // Implement email sending logic here
      }

      setShowTestTemplate(null);
      setSuccessMessage('Test notification sent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending test notification');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notification Templates</h2>
        <button
          onClick={() => setShowCreateTemplate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus size={20} />
          New Template
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg flex items-center gap-2 text-green-500">
          <CheckCircle2 size={20} />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <option value="all">All Types</option>
          <option value="COURSE">Course</option>
          <option value="QUIZ">Quiz</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      <div className="space-y-4">
        {templates
          .filter(template => {
            const matchesSearch = 
              template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              template.title_template.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesType = typeFilter === 'all' || template.notification_type === typeFilter;

            return matchesSearch && matchesType;
          })
          .map(template => (
            <div
              key={template.id}
              className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-400">{template.notification_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTestTemplate(template.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Send size={20} />
                  </button>
                  <button
                    onClick={() => setShowEditTemplate(template.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-red-500"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    In-App Notification
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{template.title_template}</p>
                    <p className="text-sm text-gray-400">{template.message_template}</p>
                  </div>
                </div>

                {template.email_subject && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      Email Notification
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{template.email_subject}</p>
                      <p className="text-sm text-gray-400">{template.email_body}</p>
                    </div>
                  </div>
                )}
              </div>

              {template.variables.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Variables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map(variable => (
                      <span
                        key={variable}
                        className="px-2 py-1 text-xs bg-gray-700 rounded-full"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={showCreateTemplate || !!showEditTemplate}
        onClose={() => {
          setShowCreateTemplate(false);
          setShowEditTemplate(null);
        }}
        title={showCreateTemplate ? 'Create Template' : 'Edit Template'}
        isDarkMode={isDarkMode}
      >
        {/* Template form */}
      </Modal>

      {/* Test Template Modal */}
      <Modal
        isOpen={!!showTestTemplate}
        onClose={() => setShowTestTemplate(null)}
        title="Test Template"
        isDarkMode={isDarkMode}
      >
        {showTestTemplate && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Test Variables</h3>
              {templates
                .find(t => t.id === showTestTemplate)
                ?.variables.map(variable => (
                  <div key={variable} className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      {variable}
                    </label>
                    <input
                      type="text"
                      value={testVariables[variable] || ''}
                      onChange={(e) => setTestVariables(prev => ({
                        ...prev,
                        [variable]: e.target.value
                      }))}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'bg-white border-gray-200'
                      }`}
                      placeholder={`Enter value for ${variable}`}
                    />
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowTestTemplate(null)}
                className="px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => showTestTemplate && handleTestTemplate(showTestTemplate)}
                disabled={isSending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
                Send Test
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}