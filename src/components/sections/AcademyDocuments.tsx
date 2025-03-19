import React, { useState } from 'react';
import { FileText, Clock, Download, Eye } from 'lucide-react';

interface AcademyDocumentsProps {
  isDarkMode: boolean;
}

export function AcademyDocuments({ isDarkMode }: AcademyDocumentsProps) {
  const [documents] = useState([
    {
      id: '1',
      title: 'Protocollo Emergenze Cardiache',
      type: 'PDF',
      size: '2.4 MB',
      url: 'https://example.com/sample.pdf',
      lastUpdate: '2024-03-15',
      course: 'Gestione Emergenze Mediche',
      video: 'Introduzione alle Emergenze Cardiache'
    },
    {
      id: '2',
      title: 'Checklist Procedure Standard',
      type: 'PDF',
      size: '1.8 MB',
      url: 'https://example.com/sample2.pdf',
      lastUpdate: '2024-03-14',
      course: 'Gestione Emergenze Mediche',
      video: 'Protocolli di Primo Intervento'
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Documenti Academy</h2>
      </div>

      <div className="space-y-4">
            {documents.map(doc => (
              <div 
                key={doc.id}
                className={`p-4 rounded-xl border ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      <FileText size={24} className="text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{doc.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      className="p-2 text-gray-400 hover:text-purple-500 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Eye size={20} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-purple-500 hover:bg-gray-700 rounded-lg transition-colors">
                      <Download size={20} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div>
                      <p>Corso: {doc.course}</p>
                      <p>Video: {doc.video}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>Ultimo aggiornamento: {doc.lastUpdate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}