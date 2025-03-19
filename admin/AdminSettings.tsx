import React, { useState, useEffect } from 'react';
import { 
  Save, AlertTriangle, RefreshCw, Shield, Lock, Mail,
  Bell, Clock, Users, Key, Database
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AdminSettingsProps {
  isDarkMode: boolean;
}

interface Setting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  is_sensitive: boolean;
}

export function AdminSettings({ isDarkMode }: AdminSettingsProps) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Update each changed setting
      for (const [key, value] of Object.entries(editedSettings)) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ value })
          .eq('key', key);

        if (error) throw error;
      }

      setSuccessMessage('Settings saved successfully');
      setEditedSettings({});
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield size={20} />;
      case 'auth':
        return <Lock size={20} />;
      case 'notifications':
        return <Bell size={20} />;
      case 'email':
        return <Mail size={20} />;
      case 'sessions':
        return <Clock size={20} />;
      case 'users':
        return <Users size={20} />;
      case 'database':
        return <Database size={20} />;
      default:
        return <Key size={20} />;
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
        <h2 className="text-2xl font-bold">Admin Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(editedSettings).length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          Save Changes
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
          <Shield size={20} />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(
          settings.reduce<Record<string, Setting[]>>((acc, setting) => {
            if (!acc[setting.category]) acc[setting.category] = [];
            acc[setting.category].push(setting);
            return acc;
          }, {})
        ).map(([category, categorySettings]) => (
          <div
            key={category}
            className={`p-6 rounded-xl border ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              {getCategoryIcon(category)}
              <h3 className="text-lg font-medium capitalize">{category}</h3>
            </div>

            <div className="space-y-4">
              {categorySettings.map(setting => (
                <div key={setting.key}>
                  <label className="block text-sm font-medium mb-2">
                    {setting.description}
                  </label>
                  {setting.is_sensitive ? (
                    <input
                      type="password"
                      value={editedSettings[setting.key] || setting.value}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'bg-white border-gray-200'
                      }`}
                    />
                  ) : typeof setting.value === 'object' ? (
                    <textarea
                      value={JSON.stringify(
                        editedSettings[setting.key] || setting.value,
                        null,
                        2
                      )}
                      onChange={(e) => {
                        try {
                          const value = JSON.parse(e.target.value);
                          handleSettingChange(setting.key, value);
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={5}
                      className={`w-full px-4 py-2 rounded-lg border font-mono ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'bg-white border-gray-200'
                      }`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={editedSettings[setting.key] || setting.value}
                      onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'bg-white border-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}