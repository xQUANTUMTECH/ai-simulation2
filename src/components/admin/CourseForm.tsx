import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { VideoUploader } from '../VideoUploader';

interface CourseFormProps {
  courseId?: string;
  onClose: () => void;
  onSave: () => void;
  isDarkMode: boolean;
}

export function CourseForm({ courseId, onClose, onSave, isDarkMode }: CourseFormProps) {
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'intermediate',
    prerequisites: [] as string[],
    objectives: [] as string[],
    targetAudience: [] as string[],
    estimatedDuration: '',
    maxParticipants: 50,
    enrollmentStartDate: '',
    enrollmentEndDate: ''
  });

  const [courseVideos, setCourseVideos] = useState<Array<{
    title: string;
    description: string;
    order: number;
    file?: File;
    knowledgeFile?: File;
    duration?: string;
    thumbnail?: string;
    status: 'pending' | 'uploading' | 'processing' | 'ready' | 'error';
    progress?: number;
    error?: string;
    size?: string;
    format?: string;
  }>>([]);

  const [courseDocuments, setCourseDocuments] = useState<Array<{
    title: string;
    description: string;
    type: string;
    file?: File;
    size?: string;
    uploadProgress?: number;
    status: 'pending' | 'uploading' | 'ready' | 'error';
  }>>([]);

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      setCourseData({
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        prerequisites: course.prerequisites || [],
        objectives: course.objectives || [],
        targetAudience: course.target_audience || [],
        estimatedDuration: course.estimated_duration,
        maxParticipants: course.max_participants,
        enrollmentStartDate: course.enrollment_start_date || '',
        enrollmentEndDate: course.enrollment_end_date || ''
      });

      // Load videos and documents
      // ... implement loading of related content
    } catch (error) {
      console.error('Error loading course:', error);
    }
  };

  const addVideo = () => {
    setCourseVideos(prev => [...prev, { 
      title: '',
      description: '',
      order: prev.length + 1,
      file: undefined,
      knowledgeFile: undefined,
      status: 'pending',
      duration: '',
      thumbnail: '',
      size: '',
      format: ''
    }]);
  };

  const removeVideo = (index: number) => {
    setCourseVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = (index: number, field: string, value: any) => {
    setCourseVideos(prev => prev.map((video, i) => {
      if (i === index) {
        if (field === 'file' && value instanceof File) {
          const videoEl = document.createElement('video');
          videoEl.src = URL.createObjectURL(value);
          videoEl.onloadedmetadata = () => {
            const duration = `${Math.floor(videoEl.duration / 60)}:${Math.floor(videoEl.duration % 60).toString().padStart(2, '0')}`;
            handleVideoChange(index, 'duration', duration);
            URL.revokeObjectURL(videoEl.src);
          };
        }
        return { ...video, [field]: value };
      }
      return video;
    }));
  };

  const addDocument = () => {
    setCourseDocuments(prev => [...prev, { 
      title: '',
      description: '',
      type: 'pdf',
      file: undefined,
      status: 'pending',
      size: ''
    }]);
  };

  const removeDocument = (index: number) => {
    setCourseDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (index: number, field: string, value: any) => {
    setCourseDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  return (
    <form className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Titolo del Corso</label>
        <input
          type="text"
          value={courseData.title}
          onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Inserisci il titolo del corso"
          className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Descrizione</label>
        <textarea
          value={courseData.description}
          onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descrivi il corso..."
          className="w-full h-32 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Video del Corso</label>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Video ({courseVideos.length})</h3>
            <button
              type="button"
              onClick={addVideo}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Plus size={16} />
              Aggiungi Video
            </button>
          </div>

          {courseVideos.map((video, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Video {index + 1}</h4>
                  {video.size && (
                    <p className="text-sm text-gray-400">
                      {video.size} • {video.format}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeVideo(index)}
                  className="p-2 text-red-500 hover:bg-gray-600 rounded-lg"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Titolo</label>
                  <input
                    type="text"
                    value={video.title}
                    onChange={(e) => handleVideoChange(index, 'title', e.target.value)}
                    placeholder="Titolo del video"
                    className="w-full px-4 py-2 bg-gray-600 rounded-lg border border-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Descrizione</label>
                  <textarea
                    value={video.description}
                    onChange={(e) => handleVideoChange(index, 'description', e.target.value)}
                    placeholder="Descrizione del video"
                    className="w-full px-4 py-2 bg-gray-600 rounded-lg border border-gray-500 h-20"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ordine</label>
                  <input
                    type="number"
                    value={video.order}
                    onChange={(e) => handleVideoChange(index, 'order', parseInt(e.target.value))}
                    min="1"
                    className="w-full px-4 py-2 bg-gray-600 rounded-lg border border-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">File Video</label>
                    <VideoUploader
                      onUploadComplete={(videoData) => {
                        handleVideoChange(index, 'file', null);
                        handleVideoChange(index, 'url', videoData.url);
                        handleVideoChange(index, 'duration', videoData.duration);
                        handleVideoChange(index, 'size', videoData.size);
                        handleVideoChange(index, 'format', videoData.format);
                        handleVideoChange(index, 'status', 'ready');
                      }}
                      onError={(error) => {
                        handleVideoChange(index, 'error', error);
                        handleVideoChange(index, 'status', 'error');
                      }}
                      isDarkMode={isDarkMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">File Knowledge Base</label>
                    <input
                      type="file"
                      accept=".txt,.doc,.docx,.pdf"
                      onChange={(e) => handleVideoChange(index, 'knowledgeFile', e.target.files?.[0])}
                      className="hidden"
                      id={`knowledge-${index}`}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`knowledge-${index}`)?.click()}
                      className="w-full px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      {video.knowledgeFile ? video.knowledgeFile.name : 'Scegli File'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Documenti del Corso</label>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Documenti ({courseDocuments.length})</h3>
            <button
              type="button"
              onClick={addDocument}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Plus size={16} />
              Aggiungi Documento
            </button>
          </div>

          {courseDocuments.map((doc, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Documento {index + 1}</h4>
                  {doc.size && (
                    <p className="text-sm text-gray-400">{doc.size}</p>
                  )}
                </div>
                <button
                  onClick={() => removeDocument(index)}
                  className="p-2 text-red-500 hover:bg-gray-600 rounded-lg"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Titolo</label>
                  <input
                    type="text"
                    value={doc.title}
                    onChange={(e) => handleDocumentChange(index, 'title', e.target.value)}
                    placeholder="Titolo del documento"
                    className="w-full px-4 py-2 bg-gray-600 rounded-lg border border-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Descrizione</label>
                  <textarea
                    value={doc.description}
                    onChange={(e) => handleDocumentChange(index, 'description', e.target.value)}
                    placeholder="Descrizione del documento"
                    className="w-full px-4 py-2 bg-gray-600 rounded-lg border border-gray-500 h-20"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                  <select
                    value={doc.type}
                    onChange={(e) => handleDocumentChange(index, 'type', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-600 rounded-lg border border-gray-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="doc">Word</option>
                    <option value="txt">Testo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">File</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => handleDocumentChange(index, 'file', e.target.files?.[0])}
                    className="hidden"
                    id={`doc-${index}`}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(`doc-${index}`)?.click()}
                    className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      doc.status === 'uploading' ? 'bg-blue-500 text-white' :
                      doc.status === 'ready' ? 'bg-green-500 text-white' :
                      doc.status === 'error' ? 'bg-red-500 text-white' :
                      'bg-gray-600 hover:bg-gray-500'}`}
                  >
                    {doc.file ? doc.file.name : 'Scegli File'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Annulla
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          {courseId ? 'Salva Modifiche' : 'C rea Corso'}
        </button>
      </div>
    </form>
  );
}