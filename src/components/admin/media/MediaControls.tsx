import React from 'react';
import { Search, Filter, Grid, List, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { MediaType, SortField, SortOrder, ThemeProps } from './MediaTypes';

interface MediaControlsProps extends ThemeProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: MediaType;
  setSelectedType: (type: MediaType) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: SortField;
  setSortBy: (field: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
}

/**
 * Componente per i controlli di ricerca, filtri e ordinamento della media library
 */
export function MediaControls({
  isDarkMode,
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder
}: MediaControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
      {/* Ricerca */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Cerca media..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full px-4 py-2 pl-10 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-200 text-gray-800'
          }`}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
      </div>
      
      {/* Filtri */}
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1 text-sm ${
                selectedType === 'all'
                  ? isDarkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-600'
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setSelectedType('video')}
              className={`px-3 py-1 text-sm ${
                selectedType === 'video'
                  ? isDarkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-600'
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setSelectedType('document')}
              className={`px-3 py-1 text-sm ${
                selectedType === 'document'
                  ? isDarkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-600'
                    : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Documenti
            </button>
          </div>
        </div>
        
        {/* Dropdown Ordinamento */}
        <div className="relative group">
          <button 
            className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            title="Ordina per"
          >
            <SlidersHorizontal size={20} className="text-gray-500" />
          </button>
          
          <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg z-10 overflow-hidden hidden group-hover:block ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium">Ordina per</p>
            </div>
            
            <div className="p-2">
              {(['name', 'created_at', 'size', 'type'] as SortField[]).map(field => (
                <button
                  key={field}
                  onClick={() => {
                    if (sortBy === field) {
                      // Toggle order if same field
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(field);
                      setSortOrder('asc');
                    }
                  }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-left text-sm ${
                    sortBy === field
                      ? isDarkMode
                        ? 'bg-gray-700 text-blue-400'
                        : 'bg-gray-100 text-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>
                    {field === 'name' ? 'Nome' :
                      field === 'created_at' ? 'Data' :
                      field === 'size' ? 'Dimensione' : 'Tipo'}
                  </span>
                  
                  {sortBy === field && (
                    <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'transform rotate-180' : ''} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Toggle vista */}
        <div className={`p-1 rounded-lg flex items-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded ${
              viewMode === 'grid'
                ? isDarkMode
                  ? 'bg-gray-600 text-blue-400'
                  : 'bg-white text-blue-500 shadow'
                : ''
            }`}
            title="Vista griglia"
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${
              viewMode === 'list'
                ? isDarkMode
                  ? 'bg-gray-600 text-blue-400'
                  : 'bg-white text-blue-500 shadow'
                : ''
            }`}
            title="Vista lista"
          >
            <List size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
