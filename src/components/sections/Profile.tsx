import React, { useState, useEffect } from 'react';
import { User, Mail, Building2, Bell, Moon, Sun, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface ProfileProps {
  isDarkMode: boolean;
  onThemeChange: (isDark: boolean) => void;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  department: string;
  role: string;
}

interface UserSettings {
  email_notifications: boolean;
  language: string;
  theme: 'light' | 'dark';
}

export function Profile({ isDarkMode, onThemeChange }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [editedSettings, setEditedSettings] = useState<Partial<UserSettings>>({});

  useEffect(() => {
    loadProfileAndSettings();
  }, []);

  const loadProfileAndSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      setProfile(profileData);
      setSettings(settingsData || {
        email_notifications: true,
        language: 'it',
        theme: isDarkMode ? 'dark' : 'light'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccessMessage(null);

      if (!profile?.id) throw new Error('Profile not found');

      // Update profile if changed
      if (Object.keys(editedProfile).length > 0) {
        const { error: profileError } = await supabase
          .from('users')
          .update(editedProfile)
          .eq('id', profile.id);

        if (profileError) throw profileError;
      }

      // Update settings if changed
      if (Object.keys(editedSettings).length > 0) {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: profile.id,
            ...settings,
            ...editedSettings
          });

        if (settingsError) throw settingsError;
      }

      await loadProfileAndSettings();
      setSuccessMessage('Profilo aggiornato con successo');
      setIsEditing(false);
      setEditedProfile({});
      setEditedSettings({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Profilo Utente</h2>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg flex items-center gap-2 text-green-500">
          <AlertCircle size={20} />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Information */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-6">Informazioni Personali</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={isEditing ? (editedProfile.full_name ?? profile?.full_name) : profile?.full_name}
                  onChange={(e) => setEditedProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                      : 'bg-white border-gray-200 focus:border-purple-400'
                  } ${!isEditing && 'opacity-75'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={profile?.email}
                  disabled
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-white border-gray-200'
                  } opacity-75`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dipartimento</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={isEditing ? (editedProfile.department ?? profile?.department) : profile?.department}
                  onChange={(e) => setEditedProfile(prev => ({ ...prev, department: e.target.value }))}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                      : 'bg-white border-gray-200 focus:border-purple-400'
                  } ${!isEditing && 'opacity-75'}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-6">Preferenze</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifiche Email</p>
                <p className="text-sm text-gray-400">Ricevi aggiornamenti via email</p>
              </div>
              <button
                onClick={() => setEditedSettings(prev => ({
                  ...prev,
                  email_notifications: !(editedSettings.email_notifications ?? settings?.email_notifications)
                }))}
                disabled={!isEditing}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  (editedSettings.email_notifications ?? settings?.email_notifications)
                    ? 'bg-purple-500'
                    : 'bg-gray-600'
                } ${!isEditing && 'opacity-75'}`}
              >
                <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${
                  (editedSettings.email_notifications ?? settings?.email_notifications)
                    ? 'right-1'
                    : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-gray-400">Personalizza l'aspetto</p>
              </div>
              <button
                onClick={() => {
                  const newTheme = isDarkMode ? 'light' : 'dark';
                  setEditedSettings(prev => ({ ...prev, theme: newTheme }));
                  onThemeChange(!isDarkMode);
                }}
                disabled={!isEditing}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                } ${!isEditing && 'opacity-75'}`}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Lingua</label>
              <select
                value={editedSettings.language ?? settings?.language}
                onChange={(e) => setEditedSettings(prev => ({ ...prev, language: e.target.value }))}
                disabled={!isEditing}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                } ${!isEditing && 'opacity-75'}`}
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedProfile({});
                setEditedSettings({});
              }}
              className="px-6 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <Save size={20} />
              Salva Modifiche
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Modifica Profilo
          </button>
        )}
      </div>
    </div>
  );
}