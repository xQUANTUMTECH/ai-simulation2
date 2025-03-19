import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, Settings as SettingsIcon, Bell, Save, AlertTriangle,
  RefreshCw, CheckCircle2, Globe, Database, Code, Server
} from 'lucide-react';

interface SystemSettingsProps {
  isDarkMode: boolean;
}

interface Settings {
  email: {
    smtp_server: string;
    smtp_port: string;
    smtp_user: string;
    smtp_password: string;
    from_name: string;
    require_verification: boolean;
  };
  security: {
    max_login_attempts: number;
    lockout_duration: number;
    session_timeout: number;
    require_strong_passwords: boolean;
    allow_multiple_sessions: boolean;
  };
  system: {
    maintenance_mode: boolean;
    debug_mode: boolean;
    allow_registration: boolean;
    default_user_role: string;
  };
  features: {
    enable_ai: boolean;
    enable_chat: boolean;
    enable_video: boolean;
    enable_analytics: boolean;
  };
}

export function SystemSettings({ isDarkMode }: SystemSettingsProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'security' | 'system' | 'features'>('email');
  const [settings, setSettings] = useState<Settings>({
    email: {
      smtp_server: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_password: '',
      from_name: 'Simulazione AI',
      require_verification: true
    },
    security: {
      max_login_attempts: 5,
      lockout_duration: 30,
      session_timeout: 60,
      require_strong_passwords: true,
      allow_multiple_sessions: false
    },
    system: {
      maintenance_mode: false,
      debug_mode: false,
      allow_registration: true,
      default_user_role: 'USER'
    },
    features: {
      enable_ai: true,
      enable_chat: true,
      enable_video: true,
      enable_analytics: true
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Load settings from API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading settings');
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // TODO: Save settings to API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      setSuccessMessage('Settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Settings</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
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
          <CheckCircle2 size={20} />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 -mb-px transition-colors ${
            activeTab === 'email'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail size={20} />
            <span>Email</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 -mb-px transition-colors ${
            activeTab === 'security'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock size={20} />
            <span>Security</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 -mb-px transition-colors ${
            activeTab === 'system'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Server size={20} />
            <span>System</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`px-4 py-2 -mb-px transition-colors ${
            activeTab === 'features'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Code size={20} />
            <span>Features</span>
          </div>
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'email' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">SMTP Server</label>
              <input
                type="text"
                value={settings.email.smtp_server}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, smtp_server: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                placeholder="smtp.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SMTP Port</label>
              <input
                type="text"
                value={settings.email.smtp_port}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, smtp_port: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                placeholder="587"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SMTP Username</label>
              <input
                type="text"
                value={settings.email.smtp_user}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, smtp_user: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SMTP Password</label>
              <input
                type="password"
                value={settings.email.smtp_password}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, smtp_password: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">From Name</label>
              <input
                type="text"
                value={settings.email.from_name}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, from_name: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                placeholder="Simulazione AI"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email.require_verification}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, require_verification: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Require Email Verification</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Max Login Attempts</label>
              <input
                type="number"
                value={settings.security.max_login_attempts}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, max_login_attempts: parseInt(e.target.value) }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                min="1"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={settings.security.lockout_duration}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, lockout_duration: parseInt(e.target.value) }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                min="5"
                max="1440"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.security.session_timeout}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, session_timeout: parseInt(e.target.value) }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                min="5"
                max="1440"
              />
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.require_strong_passwords}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, require_strong_passwords: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Require Strong Passwords</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.allow_multiple_sessions}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, allow_multiple_sessions: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Allow Multiple Sessions</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.system.maintenance_mode}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, maintenance_mode: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Maintenance Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.system.debug_mode}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, debug_mode: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Debug Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.system.allow_registration}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, allow_registration: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Allow Registration</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Default User Role</label>
              <select
                value={settings.system.default_user_role}
                onChange={(e) => setSettings({
                  ...settings,
                  system: { ...settings.system, default_user_role: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.features.enable_ai}
                  onChange={(e) => setSettings({
                    ...settings,
                    features: { ...settings.features, enable_ai: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Enable AI Features</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.features.enable_chat}
                  onChange={(e) => setSettings({
                    ...settings,
                    features: { ...settings.features, enable_chat: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Enable Chat</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.features.enable_video}
                  onChange={(e) => setSettings({
                    ...settings,
                    features: { ...settings.features, enable_video: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Enable Video</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.features.enable_analytics}
                  onChange={(e) => setSettings({
                    ...settings,
                    features: { ...settings.features, enable_analytics: e.target.checked }
                  })}
                  className="rounded border-gray-600"
                />
                <span>Enable Analytics</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}