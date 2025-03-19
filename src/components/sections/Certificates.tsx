import React, { useEffect, useState } from 'react';
import { Download, Award, ExternalLink, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase.ts';

interface CertificateProps {
  isDarkMode: boolean;
}

interface Certificate {
  id: string;
  title: string;
  description: string;
  course_title: string;
  completion_date: string;
  score: number;
  certificate_url: string;
}

export function Certificates({ isDarkMode }: CertificateProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user) {
        throw new Error('Utente non autenticato');
      }
      
      // Utilizziamo la funzione SQL personalizzata creata nella migrazione
      const { data, error } = await supabase
        .rpc('get_user_certificates', { p_user_id: user.user.id });
      
      if (error) throw error;
      
      setCertificates(data || []);
    } catch (err) {
      console.error('Errore nel recupero certificati:', err);
      setError('Si è verificato un errore nel caricamento dei certificati. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (certificate: Certificate) => {
    try {
      // In un'implementazione reale, qui si potrebbe scaricare il PDF dal bucket di storage
      // Per ora, simuliamo l'apertura del certificato in una nuova tab
      window.open(certificate.certificate_url, '_blank');
    } catch (err) {
      console.error('Errore nel download certificato:', err);
      alert('Errore nel download del certificato. Riprova più tardi.');
    }
  };

  const filteredCertificates = certificates.filter(cert => 
    cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.course_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">I tuoi Certificati</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca per titolo o corso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-200'
            }`}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className={`p-4 rounded-lg flex items-center ${isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'}`}>
          <AlertCircle className="text-red-500 mr-3" size={20} />
          <p className={isDarkMode ? 'text-red-300' : 'text-red-700'}>{error}</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Award className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} size={48} />
          <h3 className="text-lg font-medium mb-2">Nessun certificato disponibile</h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Completa i corsi della piattaforma per ottenere i certificati.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((certificate) => (
              <div 
                key={certificate.id} 
                className={`rounded-lg border overflow-hidden ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:border-purple-500' 
                    : 'bg-white border-gray-200 hover:border-purple-500'
                } transition-colors cursor-pointer`}
                onClick={() => setSelectedCertificate(certificate)}
              >
                <div className="h-40 bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center">
                  <Award className="text-white" size={64} />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg truncate">{certificate.title}</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    {certificate.course_title}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Completato il {new Date(certificate.completion_date).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isDarkMode 
                        ? 'bg-green-900 bg-opacity-30 text-green-400' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      Score: {certificate.score}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedCertificate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className={`rounded-lg max-w-3xl w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold">{selectedCertificate.title}</h2>
                  <button 
                    onClick={() => setSelectedCertificate(null)}
                    className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="h-80 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm p-8 rounded-lg text-center">
                    <Award className="text-white mx-auto mb-4" size={64} />
                    <h3 className="text-white text-xl font-bold mb-2">{selectedCertificate.title}</h3>
                    <p className="text-white text-opacity-80 mb-3">Assegnato a</p>
                    <p className="text-white text-lg font-medium">Il tuo nome</p>
                    <p className="text-white text-opacity-80 mt-4">
                      Per aver completato con successo il corso "{selectedCertificate.course_title}"
                    </p>
                    <p className="text-white text-opacity-80 mt-3">
                      {new Date(selectedCertificate.completion_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Punteggio: <span className="font-bold">{selectedCertificate.score}%</span>
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Completato il {new Date(selectedCertificate.completion_date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open(selectedCertificate.certificate_url, '_blank')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <ExternalLink size={16} />
                      <span>Visualizza</span>
                    </button>
                    <button 
                      onClick={() => downloadCertificate(selectedCertificate)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Download size={16} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
