import React, { useState, useEffect } from 'react';
import { Video, Play, Upload, Settings, BarChart, X, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { adminAuthService } from '../../services/admin-auth-service';
import { apiErrorService, ApiErrorType } from '../../services/api-error-service';

interface AdminVideosProps {
  isDarkMode: boolean;
}

interface VideoStats {
  totalVideos: number;
  activeVideos: number;
  totalViews: number;
  monthlyViews: number;
  storageUsed: number;
  storageCapacity: number;
}

export function AdminVideos({ isDarkMode }: AdminVideosProps) {
  const [stats, setStats] = useState<VideoStats>({
    totalVideos: 0,
    activeVideos: 0,
    totalViews: 0,
    monthlyViews: 0,
    storageUsed: 0,
    storageCapacity: 500
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);

  // Carica i dati delle statistiche
  useEffect(() => {
    async function fetchStats() {
      try {
        // Verifica se l'utente è admin
        if (!await validateAdmin()) {
          return;
        }
        
        if (!supabase) throw new Error('Supabase client not initialized');
        
        // Ottieni statistiche video
        const { data: videos, error: videosError } = await supabase
          .from('academy_videos')
          .select('*');
          
        if (videosError) throw videosError;
        
        // Ottieni visualizzazioni
        const { data: views, error: viewsError } = await supabase
          .from('video_views')
          .select('*');
          
        if (viewsError) throw viewsError;
        
        // Calcola visualizzazioni mensili
        const thisMonth = new Date();
        thisMonth.setDate(1); // Primo giorno del mese corrente
        
        const monthlyViewsCount = views?.filter(view => 
          new Date(view.viewed_at) >= thisMonth
        ).length || 0;
        
        // Calcola spazio di archiviazione usato
        const storageUsed = videos?.reduce((total, video) => 
          total + (video.file_size || 0), 0) || 0;
        
        // Aggiorna le statistiche
        setStats({
          totalVideos: videos?.length || 0,
          activeVideos: videos?.filter(v => v.status === 'active').length || 0,
          totalViews: views?.length || 0,
          monthlyViews: monthlyViewsCount,
          storageUsed: Math.round(storageUsed / (1024 * 1024 * 1024)), // Convertito in GB
          storageCapacity: 500 // 500GB fisso per ora
        });
        
        // Carica video recenti
        if (videos && videos.length > 0) {
          const sortedVideos = [...videos].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          setRecentVideos(sortedVideos.slice(0, 5));
        }
      } catch (err) {
        console.error('Errore nel caricamento delle statistiche:', err);
        const error = apiErrorService.parseError(err, 'fetchStats', 'admin-videos');
        setError(error.message);
        if (error.type === ApiErrorType.AUTHENTICATION) {
          adminAuthService.handleAuthError(error);
        }
      }
    }
    
    fetchStats();
  }, []);

  // Verifica se l'utente è admin
  async function validateAdmin() {
    try {
      await adminAuthService.validateAdminRequest();
      setIsAdmin(true);
      return true;
    } catch (err) {
      console.error('Errore verifica admin:', err);
      const error = apiErrorService.parseError(err, 'validateAdmin', 'admin-videos');
      setError(error.message);
      adminAuthService.handleAuthError(error);
      return false;
    }
  }

  // Gestisce la selezione del file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Valida il tipo di file
      const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        setError('Formato file non supportato. Utilizza MP4, WebM o MOV.');
        setSelectedFile(null);
        return;
      }
      
      // Verifica la dimensione (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        setError('File troppo grande. La dimensione massima è 500MB.');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  // Gestisce upload del video
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Seleziona un file da caricare');
      return;
    }
    
    if (!title.trim()) {
      setError('Inserisci un titolo per il video');
      return;
    }
    
    try {
      // Verifica nuovamente l'autenticazione per sicurezza
      await adminAuthService.validateAdminRequest();
      
      setUploading(true);
      setError(null);
      
      if (!supabase) throw new Error('Supabase client not initialized');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Utente non autenticato');
      
      // 1. Crea record nel database
      const { data: videoRecord, error: recordError } = await supabase
        .from('academy_videos')
        .insert({
          title,
          description,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          status: 'processing',
          uploaded_by: user.id
        })
        .select()
        .single();
        
      if (recordError) throw recordError;
      
      // 2. Carica il file nello storage
      const filePath = `videos/${videoRecord.id}/${selectedFile.name}`;
      
      // Gestisce progresso upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('academy-media')
        .upload(filePath, selectedFile);
        
      // Aggiorna progresso al 100% al completamento
      setUploadProgress(100);
        
      if (uploadError) throw uploadError;
      
      if (!supabase) throw new Error('Supabase client not initialized');
      
      // 3. Aggiorna record con URL file
      const fileUrl = supabase.storage
        .from('academy-media')
        .getPublicUrl(filePath).data.publicUrl;
        
      await supabase
        .from('academy_videos')
        .update({
          file_url: fileUrl,
          status: 'transcoding' // Verrà gestito dal servizio di transcodifica
        })
        .eq('id', videoRecord.id);
      
      // Aggiunge ai video recenti
      setRecentVideos([
        { 
          id: videoRecord.id, 
          title, 
          description, 
          status: 'transcoding',
          created_at: new Date().toISOString() 
        },
        ...recentVideos.slice(0, 4)
      ]);
      
      // Reset del form
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setUploadProgress(0);
      setSuccess('Video caricato con successo! La transcodifica è in corso.');
      
      // Aggiorna statistiche
      setStats(prev => ({
        ...prev,
        totalVideos: prev.totalVideos + 1,
        storageUsed: prev.storageUsed + Math.round(selectedFile.size / (1024 * 1024 * 1024))
      }));
      
    } catch (err) {
      console.error('Errore nel caricamento:', err);
      const error = apiErrorService.parseError(err, 'handleUpload', 'admin-videos');
      setError(error.message);
      if (error.type === ApiErrorType.AUTHENTICATION) {
        adminAuthService.handleAuthError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestione Video</h2>

      {error && (
        <div className={`p-4 rounded-xl border border-red-500 bg-red-500 bg-opacity-10 flex items-center gap-2 text-red-500`}>
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto p-1 rounded-full hover:bg-red-500 hover:bg-opacity-20"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className={`p-4 rounded-xl border border-green-500 bg-green-500 bg-opacity-10 flex items-center gap-2 text-green-500`}>
          <Check size={20} />
          <span>{success}</span>
          <button 
            onClick={() => setSuccess(null)} 
            className="ml-auto p-1 rounded-full hover:bg-green-500 hover:bg-opacity-20"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Video Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-20 flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium">Video Totali</h3>
              <p className="text-2xl font-bold">{stats.totalVideos}</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Attivi</span>
            <span>{stats.activeVideos}</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 bg-opacity-20 flex items-center justify-center">
              <Play className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium">Visualizzazioni Totali</h3>
              <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Questo Mese</span>
            <span>+{stats.monthlyViews.toLocaleString()}</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-20 flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium">Spazio Utilizzato</h3>
              <p className="text-2xl font-bold">{stats.storageUsed}GB</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Capacità</span>
            <span>{stats.storageCapacity}GB</span>
          </div>
        </div>
      </div>

      {/* File Upload Form */}
      <div className={`p-6 rounded-xl border ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <h3 className="text-xl font-semibold mb-4">Carica Nuovo Video</h3>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Titolo Video</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-white border-gray-200'
              }`}
              placeholder="Inserisci titolo video"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-white border-gray-200'
              }`}
              placeholder="Aggiungi una descrizione (opzionale)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">File Video</label>
            <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
              isDarkMode 
                ? 'border-gray-600 hover:border-purple-500' 
                : 'border-gray-300 hover:border-purple-500'
            } cursor-pointer transition-colors`}>
              <input 
                type="file" 
                id="videoFile"
                onChange={handleFileChange}
                className="hidden" 
                accept="video/mp4,video/webm,video/quicktime"
              />
              <label htmlFor="videoFile" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                {selectedFile ? (
                  <p className="font-medium">{selectedFile.name} ({Math.round(selectedFile.size / (1024 * 1024))}MB)</p>
                ) : (
                  <>
                    <p className="font-medium">Seleziona un file o trascina qui</p>
                    <p className="text-sm text-gray-400 mt-1">MP4, WebM o MOV fino a 500MB</p>
                  </>
                )}
              </label>
            </div>
          </div>
          
          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Caricamento in corso...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className={`w-full py-2 px-4 rounded-lg transition-colors ${
              uploading || !selectedFile
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
          >
            {uploading ? 'Caricamento in corso...' : 'Carica Video'}
          </button>
        </form>
      </div>
      
      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <h3 className="text-xl font-semibold mb-4">Video Recenti</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700">
                  <th className="text-left py-3 px-2">Titolo</th>
                  <th className="text-left py-3 px-2">Stato</th>
                  <th className="text-left py-3 px-2">Data Caricamento</th>
                </tr>
              </thead>
              <tbody>
                {recentVideos.map(video => (
                  <tr key={video.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-3 px-2">{video.title}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        video.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : video.status === 'processing' || video.status === 'transcoding'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {video.status === 'active' ? 'Attivo' :
                         video.status === 'processing' ? 'In elaborazione' :
                         video.status === 'transcoding' ? 'Transcodifica' :
                         'Non disponibile'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {new Date(video.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
