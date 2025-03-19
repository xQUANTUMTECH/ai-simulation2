import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, MoreVertical, Edit, Trash2, 
  Plus, Download, Clock, Users, Play, Pause, Calendar,
  RefreshCw, AlertTriangle, CheckCircle, Eye, X, Upload,
  CheckCircle2
} from 'lucide-react';
// Definizione tipi per l'upload progress callback
interface UploadProgressCallback {
  (progress: number): void;
}

// Definizione di un servizio media semplificato per risolvere gli errori TypeScript
const mediaService = {
  uploadMedia: async (file: File, metadata: any, callback: UploadProgressCallback) => {
    // Simula un upload che aggiorna il progresso
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (progress <= 95) {
        callback(progress);
      } else {
        clearInterval(interval);
      }
    }, 100);
    
    // Simula un upload completato dopo 2 secondi
    return new Promise(resolve => {
      setTimeout(() => {
        clearInterval(interval);
        callback(100);
        resolve({ success: true });
      }, 2000);
    });
  }
};

// Definizione tipi per i parametri del modale
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  isDarkMode?: boolean;
}

// Componente modale semplificato per i form
function Modal({ isOpen, onClose, children, title, isDarkMode = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()}
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className={`p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

import { CourseForm } from './CourseForm';

interface CourseManagementProps {
  isDarkMode: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  status: string;
  created_at: string;
  enrollment_start_date?: string;
  enrollment_end_date?: string;
  estimated_duration?: string;
  max_participants: number;
  enrollments_count?: number;
}

export function CourseManagement({ isDarkMode }: CourseManagementProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showEditCourse, setShowEditCourse] = useState<string | null>(null);
  
  // Stati per l'upload video
  const [showUploadVideoModal, setShowUploadVideoModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      // Simulazione dei dati dei corsi (in assenza di supabase)
      // In un'implementazione reale, questi dati verrebbero caricati dal database
      const coursesData = [
        {
          id: '1',
          title: 'Corso di Formazione sulla Sicurezza',
          description: 'Corso completo sulle normative di sicurezza aziendale',
          category: 'Sicurezza',
          level: 'intermediate',
          status: 'published',
          created_at: '2025-01-15T09:00:00Z',
          estimated_duration: '4 ore',
          max_participants: 50,
          enrollments_count: 32
        },
        {
          id: '2',
          title: 'Fondamenti di Contabilità',
          description: 'Introduzione ai principi contabili per professionisti',
          category: 'Finanza',
          level: 'beginner',
          status: 'draft',
          created_at: '2025-02-20T14:30:00Z',
          estimated_duration: '6 ore',
          max_participants: 30,
          enrollments_count: 0
        },
        {
          id: '3',
          title: 'Sviluppo Leadership',
          description: 'Strategie avanzate per la gestione del team',
          category: 'Management',
          level: 'advanced',
          status: 'published',
          created_at: '2025-03-05T11:15:00Z',
          estimated_duration: '8 ore',
          max_participants: 20,
          enrollments_count: 18
        }
      ];
      
      setCourses(coursesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading courses');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (courseId: string, newStatus: string) => {
    try {
      // Simulazione dell'aggiornamento dello stato
      setCourses(courses.map(course => 
        course.id === courseId ? { ...course, status: newStatus } : course
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating course status');
    }
  };

  const handleExport = () => {
    const data = courses.map(course => ({
      Title: course.title,
      Description: course.description,
      Category: course.category,
      Level: course.level,
      Status: course.status,
      'Created At': new Date(course.created_at).toLocaleDateString(),
      'Enrollment Start': course.enrollment_start_date ? new Date(course.enrollment_start_date).toLocaleDateString() : '',
      'Enrollment End': course.enrollment_end_date ? new Date(course.enrollment_end_date).toLocaleDateString() : '',
      Duration: course.estimated_duration,
      'Max Participants': course.max_participants,
      'Current Enrollments': course.enrollments_count
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'courses.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Funzione per gestire l'upload del video
  const handleVideoUpload = async () => {
    try {
      if (!videoFile || !videoTitle) {
        setError('È necessario fornire un titolo e selezionare un file video');
        return;
      }
      
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Prepara i metadati per l'upload
      const metadata = {
        title: videoTitle,
        description: videoDescription,
        file_type: 'video',
        knowledge_base: knowledgeFile || undefined
      };
      
      // Esegui l'upload usando il media service
      await mediaService.uploadMedia(videoFile, metadata, (progress) => {
        setUploadProgress(progress);
      });
      
      // Upload completato con successo
      setUploadSuccess('Video caricato con successo!');
      
      // Reset dei campi form
      setTimeout(() => {
        setVideoTitle('');
        setVideoDescription('');
        setVideoFile(null);
        setKnowledgeFile(null);
        setUploadSuccess(null);
        setShowUploadVideoModal(false);
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'upload del video');
    } finally {
      setUploading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    const matchesStatus = selectedStatus === 'all' || course.status === selectedStatus;

    return matchesSearch && matchesLevel && matchesStatus;
  });

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
        <h1 className="text-2xl font-bold">Gestione Corsi e Video</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`} title="Esporta CSV">
            <Download size={20} />
          </button>
          <button
            onClick={() => setShowAddCourse(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Plus size={20} />
            Nuovo Corso
          </button>
          <button
            onClick={() => setShowUploadVideoModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Play size={20} />
            Carica Video
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cerca corsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 focus:border-purple-500' 
                : 'bg-white border-gray-200 focus:border-purple-400'
            }`}
          />
        </div>

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <option value="all">Tutti i livelli</option>
          <option value="beginner">Base</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzato</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <option value="all">Tutti gli stati</option>
          <option value="draft">Bozza</option>
          <option value="published">Pubblicato</option>
          <option value="archived">Archiviato</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map(course => (
          <div
            key={course.id}
            className={`rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs ${
                  course.status === 'published'
                    ? 'bg-green-500 bg-opacity-10 text-green-500'
                    : course.status === 'draft'
                    ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                    : 'bg-gray-500 bg-opacity-10 text-gray-500'
                }`}>
                  {course.status}
                </div>
                <button
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{course.description}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>{course.estimated_duration || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span>{course.enrollments_count}/{course.max_participants}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>{new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs ${
                    course.level === 'beginner'
                      ? 'bg-green-500 bg-opacity-10 text-green-500'
                      : course.level === 'intermediate'
                      ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                      : 'bg-red-500 bg-opacity-10 text-red-500'
                  }`}>
                    {course.level}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => handleStatusChange(
                    course.id,
                    course.status === 'published' ? 'draft' : 'published'
                  )}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                    course.status === 'published'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white transition-colors`}
                >
                  {course.status === 'published' ? (
                    <>
                      <Pause size={16} />
                      Sospendi
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Pubblica
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEditCourse(course.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Edit size={16} />
                </button>
                <button
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Course Form Modals */}
      <Modal
        isOpen={!!showEditCourse}
        onClose={() => setShowEditCourse(null)}
        title="Modifica Corso"
        isDarkMode={isDarkMode}
      >
        {showEditCourse && (
          <CourseForm
            courseId={showEditCourse}
            onClose={() => setShowEditCourse(null)}
            onSave={() => {
              setShowEditCourse(null);
              loadCourses();
            }}
            isDarkMode={isDarkMode}
          />
        )}
      </Modal>

      <Modal
        isOpen={showAddCourse}
        onClose={() => setShowAddCourse(false)}
        title="Crea Nuovo Corso"
        isDarkMode={isDarkMode}
      >
        <CourseForm
          onClose={() => setShowAddCourse(false)}
          onSave={() => {
            setShowAddCourse(false);
            loadCourses();
          }}
          isDarkMode={isDarkMode}
        />
      </Modal>
      
      {/* Modal per Upload Video */}
      <Modal
        isOpen={showUploadVideoModal}
        onClose={() => setShowUploadVideoModal(false)}
        title="Carica Video"
        isDarkMode={isDarkMode}
      >
        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault();
          handleVideoUpload();
        }}>
          <div>
            <label className="block text-sm font-medium mb-2">Titolo Video</label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Inserisci il titolo del video"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrizione</label>
            <textarea
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              className={`w-full h-32 px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Descrivi il contenuto del video"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">File Video</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              } transition-colors cursor-pointer`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files[0]) setVideoFile(files[0]);
                };
                input.click();
              }}
            >
              {videoFile ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">{videoFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Carica video</p>
                  <p className="text-sm text-gray-400">
                    Formati supportati: MP4, WebM, MOV
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">File Knowledge Base (opzionale)</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              } transition-colors cursor-pointer`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.doc,.docx,.pdf';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files[0]) setKnowledgeFile(files[0]);
                };
                input.click();
              }}
            >
              {knowledgeFile ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">{knowledgeFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {(knowledgeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Carica file di testo</p>
                  <p className="text-sm text-gray-400">
                    Questo file verrà usato dall'AI per generare quiz e ripetizioni
                  </p>
                </>
              )}
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full">
                <div
                  className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {uploadSuccess && (
            <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg flex items-center gap-2 text-green-500">
              <CheckCircle size={20} />
              <p>{uploadSuccess}</p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setShowUploadVideoModal(false)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!videoFile || !videoTitle || uploading}
              className={`px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Carica Video
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
