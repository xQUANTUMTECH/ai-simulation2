import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, MoreVertical, Edit, Trash2, 
  Plus, Download, Clock, Users, Play, Pause, Calendar,
  RefreshCw, AlertTriangle, CheckCircle, Eye
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Modal } from '../Modal';
import { CourseForm } from './CourseForm.tsx';

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

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments:course_enrollments(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const coursesWithCount = data?.map(course => ({
        ...course,
        enrollments_count: course.enrollments?.[0]?.count || 0
      })) || [];

      setCourses(coursesWithCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading courses');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (courseId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: newStatus })
        .eq('id', courseId);

      if (error) throw error;
      
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
    </div>
  );
}