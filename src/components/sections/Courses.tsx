import React, { useState } from 'react';
import { Play, Clock, Users, BookOpen, ChevronRight, Plus } from 'lucide-react';
import { CourseDetails } from './CourseDetails';
import { CourseCreation } from './CourseCreation';

interface CoursesProps {
  isDarkMode: boolean;
}

export function Courses({ isDarkMode }: CoursesProps) {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [courses] = useState([
    {
      id: '1',
      title: 'Gestione Emergenze Mediche',
      description: 'Corso completo sulla gestione delle emergenze in ambito ospedaliero',
      duration: '8 ore',
      videos: 12,
      documents: 5,
      progress: 60
    },
    {
      id: '2',
      title: 'Procedure Chirurgiche Avanzate',
      description: 'Tecniche e protocolli per interventi chirurgici complessi',
      duration: '12 ore',
      videos: 18,
      documents: 8,
      progress: 30
    }
  ]);

  return (
    <div className="space-y-6">
      {isCreating ? (
        <CourseCreation
          isDarkMode={isDarkMode}
          onBack={() => setIsCreating(false)}
        />
      ) : selectedCourse ? (
        <CourseDetails 
          isDarkMode={isDarkMode} 
          onBack={() => setSelectedCourse(null)} 
        /> 
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Corsi</h2>
            {/* Il pulsante "Nuovo Corso" è stato rimosso perché riservato agli amministratori */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map(course => (
              <div 
                key={course.id}
                className={`p-6 rounded-xl border ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                } cursor-pointer`}
                onClick={() => setSelectedCourse(course.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{course.title}</h3>
                  <button className="p-2 text-purple-500 hover:bg-gray-700 rounded-lg transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
                
                <p className="text-gray-400 mb-6">{course.description}</p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm">{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play size={16} className="text-gray-400" />
                    <span className="text-sm">{course.videos} video</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-gray-400" />
                    <span className="text-sm">{course.documents} doc</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full">
                    <div 
                      className="h-2 bg-purple-500 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
