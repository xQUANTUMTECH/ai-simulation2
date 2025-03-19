import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChartProps } from './types';

/**
 * Componente che visualizza grafici nella dashboard
 */
export function DashboardCharts({ 
  isDarkMode, 
  timeSeriesData, 
  completionRateData, 
  quizErrorsData, 
  timeSpentData,
  colors 
}: ChartProps) {
  // Personalizzazione tooltip per tema chiaro/scuro
  const tooltipStyle = { 
    backgroundColor: isDarkMode ? "#333" : "#fff",
    borderColor: isDarkMode ? "#555" : "#ddd",
    color: isDarkMode ? "#fff" : "#333"
  };

  // Colore per grid e assi
  const gridColor = isDarkMode ? "#444" : "#eee";
  const axisColor = isDarkMode ? "#aaa" : "#666";

  return (
    <>
      {/* Grafici principali - prima riga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Grafico tendenza utenti */}
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Tendenza Utenti e Contenuti</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={timeSeriesData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip 
                  contentStyle={tooltipStyle} 
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="utenti"
                  stroke={colors[0]}
                  activeDot={{ r: 8 }}
                  name="Utenti Attivi"
                />
                <Line 
                  type="monotone" 
                  dataKey="videosVisti" 
                  stroke={colors[1]} 
                  name="Video Visti"
                />
                <Line 
                  type="monotone" 
                  dataKey="completamenti" 
                  stroke={colors[2]} 
                  name="Corsi Completati"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico tasso di completamento */}
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Tassi di Completamento per Categoria</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={completionRateData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip 
                  contentStyle={tooltipStyle} 
                />
                <Legend />
                <Bar 
                  dataKey="value" 
                  fill={colors[0]} 
                  name="Tasso di Completamento (%)"
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grafici a torta - seconda riga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Grafico errori quiz */}
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Distribuzione Errori nei Quiz</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={quizErrorsData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill={colors[0]}
                  dataKey="value"
                >
                  {quizErrorsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={tooltipStyle} 
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico tempo speso */}
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Tempo Speso per Tipo di Contenuto</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={timeSpentData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill={colors[0]}
                  dataKey="value"
                >
                  {timeSpentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={tooltipStyle} 
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardCharts;
