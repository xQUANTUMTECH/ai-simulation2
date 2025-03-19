import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash, 
  Upload, 
  FileText, 
  Video, 
  AlertCircle, 
  Eye, 
  BarChart,
  Users,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../services/supabase.ts';

interface CourseManagerProps {
  isDarkMode: boolean;
  isAdmin: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  updated_at: string;
  author_id: string;
  published: boolean;
  category: string;
  duration_minutes: number;
  enrollments_count: number;
}

interface ContentItem {
  id: string;
  course_id: string;
  title: string;
  type: 'video' | 'document' | 'quiz';
  order: number;
  description?: string;
  url?: string;
  duration_minutes?: number;
}

export function CourseManager({ isDarkMode, isAdmin }: CourseManagerProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [courseContent, setCourseContent] = useState<{[key: string]: ContentItem[]}>({});
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'video' | 'document' | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [isAdmin]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Query diversa per admin e utenti normali
      let query = supabase
        .from('courses')
        .select('*');
        
      // Se non è admin, mostra solo i corsi pubblicati
      if (!isAdmin) {
        query = query.eq('published', true);
      }
      
      // Ordina i corsi
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setCourses(data || []);
    } catch (err) {
      console.error('Errore nel recupero corsi:', err);
      setError('Si è verificato un errore nel caricamento dei corsi. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseExpanded = async (courseId: string) => {
    if (expandedCourses.includes(courseId)) {
      setExpandedCourses(prev => prev.filter(id => id !== courseId));
    } else {
      setExpandedCourses(prev => [...prev, courseId]);
      
      // Carica i contenuti del corso se non sono già stati caricati
      if (!courseContent[courseId]) {
        try {
          if (!supabase) {
            throw new Error('Connessione al database non disponibile');
          }
          
          const { data, error } = await supabase
            .from('course_contents')
            .select('*')
            .eq('course_id', courseId)
            .order('order', { ascending: true });
          
          if (error) throw error;
          
          setCourseContent(prev => ({
            ...prev,
            [courseId]: data || []
          }));
        } catch (err) {
          console.error(`Errore nel recupero dei contenuti per il corso ${courseId}:`, err);
        }
      }
    }
  };

  const handleUploadClick = (course: Course, type: 'video' | 'document') => {
    if (!isAdmin) {
      alert('Solo gli amministratori possono caricare contenuti');
      return;
    }
    
    setSelectedCourse(course);
    setUploadType(type);
    setUploadModalOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!isAdmin) {
      alert('Solo gli amministratori possono eliminare corsi');
      return;
    }
    
    if (!confirm('Sei sicuro di voler eliminare questo corso? Questa azione non può essere annullata.')) {
      return;
    }
    
    try {
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      // Aggiorna la lista dei corsi
      setCourses(prev => prev.filter(course => course.id !== courseId));
      
      // Rimuovi il corso espanso e i suoi contenuti
      setExpandedCourses(prev => prev.filter(id => id !== courseId));
      setCourseContent(prev => {
        const newContent = { ...prev };
        delete newContent[courseId];
        return newContent;
      });
    } catch (err) {
      console.error('Errore nell\'eliminazione del corso:', err);
      alert('Si è verificato un errore nell\'eliminazione del corso. Riprova più tardi.');
    }
  };

  const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isAdmin || !selectedCourse || !uploadType) {
      setUploadModalOpen(false);
      return;
    }
    
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const titleInput = form.elements.namedItem('title') as HTMLInputElement;
    const descriptionInput = form.elements.namedItem('description') as HTMLTextAreaElement;
    
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Seleziona un file da caricare');
      return;
    }
    
    const file = fileInput.files[0];
    const title = titleInput.value;
    const description = descriptionInput.value;
    
    try {
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // 1. Carica il file nel bucket appropriato
      const fileName = `${selectedCourse.id}/${Date.now()}_${file.name}`;
      const bucket = uploadType === 'video' ? 'videos' : 'documents';
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // 2. Ottieni l'URL pubblico
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      // 3. Determina l'ordine del nuovo contenuto
      const existingContents = courseContent[selectedCourse.id] || [];
      const newOrder = existingContents.length > 0 
        ? Math.max(...existingContents.map(item => item.order)) + 1 
        : 1;
      
      // 4. Crea il record del contenuto
      const newContent: Partial<ContentItem> = {
        course_id: selectedCourse.id,
        title,
        description,
        type: uploadType,
        url: publicUrl,
        order: newOrder
      };
      
      const { data: contentData, error: contentError } = await supabase
        .from('course_contents')
        .insert(newContent)
        .select()
        .single();
      
      if (contentError) throw contentError;
      
      // 5. Aggiorna lo stato locale
      setCourseContent(prev => ({
        ...prev,
        [selectedCourse.id]: [...(prev[selectedCourse.id] || []), contentData]
      }));
      
      // 6. Chiudi il modal
      setUploadModalOpen(false);
      setSelectedCourse(null);
      setUploadType(null);
      
      alert('File caricato con successo!');
    } catch (err) {
      console.error('Errore nel caricamento del file:', err);
      alert('Si è verificato un errore nel caricamento del file. Riprova più tardi.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg flex items-center ${isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'}`}>
        <AlertCircle className="text-red-500 mr-3" size={20} />
        <p className={isDarkMode ? 'text-red-300' : 'text-red-700'}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestione Corsi</h2>
        
        {isAdmin && (
          <button 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            onClick={() => alert('Funzionalità di creazione corso da implementare')}
          >
            <Plus size={18} />
            <span>Nuovo Corso</span>
          </button>
        )}
      </div>
      
      {courses.length === 0 ? (
        <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <FileText className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} size={48} />
          <h3 className="text-lg font-medium mb-2">Nessun corso disponibile</h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isAdmin 
              ? 'Crea un nuovo corso per iniziare.'
              : 'Non ci sono corsi disponibili al momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className={`border rounded-lg overflow-hidden ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}
                onClick={() => toggleCourseExpanded(course.id)}
              >
                <div className="flex items-center">
                  {!course.published && (
                    <div className="mr-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Bozza</div>
                  )}
                  <h3 className="font-bold">{course.title}</h3>
                  <span className={`ml-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {course.category} • {course.duration_minutes} min
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aggiornato: {formatDate(course.updated_at)}
                  </span>
                  
                  {expandedCourses.includes(course.id) 
                    ? <ChevronUp size={20} /> 
                    : <ChevronDown size={20} />
                  }
                </div>
              </div>
              
              {expandedCourses.includes(course.id) && (
                <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Livello</p>
                      <p className="font-medium capitalize">{course.level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Categoria</p>
                      <p className="font-medium">{course.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Durata</p>
                      <p className="font-medium">{course.duration_minutes} minuti</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Iscritti</p>
                      <p className="font-medium">{course.enrollments_count || 0}</p>
                    </div>
                  </div>
                  
                  <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {course.description}
                  </p>
                  
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Contenuti</h4>
                    
                    {courseContent[course.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {courseContent[course.id].map((content) => (
                          <div 
                            key={content.id} 
                            className={`p-3 rounded-lg flex items-center ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                            }`}
                          >
                            {content.type === 'video' ? (
                              <Video className="mr-3 flex-shrink-0" size={20} />
                            ) : content.type === 'document' ? (
                              <FileText className="mr-3 flex-shrink-0" size={20} />
                            ) : (
                              <BarChart className="mr-3 flex-shrink-0" size={20} />
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{content.title}</p>
                              {content.description && (
                                <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {content.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <button 
                                className={`p-2 rounded-full ${
                                  isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                }`}
                                onClick={() => window.open(content.url, '_blank')}
                              >
                                <Eye size={16} />
                              </button>
                              
                              {isAdmin && (
                                <button 
                                  className={`p-2 rounded-full ${
                                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                  }`}
                                  onClick={() => alert('Funzionalità di modifica da implementare')}
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Nessun contenuto disponibile per questo corso.
                      </p>
                    )}
                    
                    {isAdmin && (
                      <div className="mt-4 flex gap-3">
                        <button 
                          className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 hover:bg-gray-600' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          onClick={() => handleUploadClick(course, 'video')}
                        >
                          <Upload size={14} />
                          <span>Video</span>
                        </button>
                        
                        <button 
                          className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 hover:bg-gray-600' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          onClick={() => handleUploadClick(course, 'document')}
                        >
                          <Upload size={14} />
                          <span>Documento</span>
                        </button>
                        
                        <button 
                          className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 hover:bg-gray-600' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          onClick={() => alert('Funzionalità di creazione quiz da implementare')}
                        >
                          <Plus size={14} />
                          <span>Quiz</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                      <button 
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                        onClick={() => alert('Funzionalità di modifica corso da implementare')}
                      >
                        <Edit size={16} />
                        <span>Modifica</span>
                      </button>
                      
                      <button 
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                        onClick={() => handleDeleteCourse(course.id)}
                      >
                        <Trash size={16} />
                        <span>Elimina</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {!isAdmin && (
        <div className={`p-4 rounded-lg flex items-center ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <Lock className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mr-3`} size={20} />
          <div>
            <p className="font-medium">Privilegi di accesso limitati</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Solo gli amministratori possono caricare contenuti e modificare i corsi. 
              Contatta un amministratore se hai bisogno di assistenza.
            </p>
          </div>
        </div>
      )}
      
      {/* Modal di caricamento */}
      {uploadModalOpen && selectedCourse && uploadType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-md w-full p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">
              Carica {uploadType === 'video' ? 'Video' : 'Documento'}
            </h2>
            
            <form onSubmit={handleUploadSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="title">
                    Titolo
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="description">
                    Descrizione
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="file">
                    File
                  </label>
                  <input
                    type="file"
                    id="file"
                    name="file"
                    required
                    className={`w-full ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                    accept={uploadType === 'video' ? 'video/*' : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
                  />
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {uploadType === 'video' 
                      ? 'Formati supportati: MP4, WebM, MOV. Max 500MB.'
                      : 'Formati supportati: PDF, DOC, DOCX. Max 50MB.'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedCourse(null);
                    setUploadType(null);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Carica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
