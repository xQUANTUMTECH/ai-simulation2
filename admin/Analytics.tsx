import React, { useState, useEffect } from 'react';
import { 
  BarChart, ArrowUp, ArrowDown, Users, Clock, Brain, FileText,
  Download, RefreshCw, Plus, AlertTriangle, Calendar, Filter,
  Search, ChevronDown
} from 'lucide-react';
import { analyticsService, AnalyticsDashboard, AnalyticsReport } from '../../services/analytics-service';
import { Modal } from '../Modal';

interface AnalyticsProps {
  isDarkMode: boolean;
}

export function Analytics({ isDarkMode }: AnalyticsProps) {
  const [dashboards, setDashboards] = useState<AnalyticsDashboard[]>([]);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDashboard, setShowCreateDashboard] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [runningReport, setRunningReport] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [dashboardsData, reportsData] = await Promise.all([
        analyticsService.getDashboards(),
        analyticsService.getReports()
      ]);
      setDashboards(dashboardsData);
      setReports(reportsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRunReport = async (reportId: string) => {
    try {
      setRunningReport(reportId);
      const fileUrl = await analyticsService.runReport(reportId);
      window.open(fileUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error running report');
    } finally {
      setRunningReport(null);
    }
  };

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
        <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateDashboard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Plus size={20} />
            New Dashboard
          </button>
          <button
            onClick={() => setShowCreateReport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            New Report
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              12%
            </span>
          </div>
          <h3 className="text-2xl font-bold">1,250</h3>
          <p className="text-gray-400">Active Users</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              8.3%
            </span>
          </div>
          <h3 className="text-2xl font-bold">45h</h3>
          <p className="text-gray-400">Avg Learning Time</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              25.4%
            </span>
          </div>
          <h3 className="text-2xl font-bold">15.6K</h3>
          <p className="text-gray-400">AI Interactions</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              15.2%
            </span>
          </div>
          <h3 className="text-2xl font-bold">892</h3>
          <p className="text-gray-400">Resources Accessed</p>
        </div>
      </div>

      {/* Dashboards */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Dashboards</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search dashboards..."
                className={`pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-200'
                }`}
              />
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboards.map(dashboard => (
            <div
              key={dashboard.id}
              className={`p-4 rounded-lg border ${
                isDarkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">{dashboard.title}</h4>
                <button className="p-1 hover:bg-gray-600 rounded transition-colors">
                  <ChevronDown size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-4">{dashboard.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {new Date(dashboard.updated_at).toLocaleDateString()}
                </span>
                {dashboard.is_public && (
                  <span className="px-2 py-1 bg-purple-500 bg-opacity-20 text-purple-500 rounded-full text-xs">
                    Public
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Reports</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search reports..."
                className={`pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-200'
                }`}
              />
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {reports.map(report => (
            <div
              key={report.id}
              className={`p-4 rounded-lg border ${
                isDarkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{report.title}</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReport(report.id)}
                    className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => handleRunReport(report.id)}
                    disabled={runningReport === report.id}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                  >
                    {runningReport === report.id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    Run Report
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">{report.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>
                    {report.last_run_at
                      ? new Date(report.last_run_at).toLocaleDateString()
                      : 'Never run'}
                  </span>
                </div>
                {report.schedule && (
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{report.schedule}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Dashboard Modal */}
      <Modal
        isOpen={showCreateDashboard}
        onClose={() => setShowCreateDashboard(false)}
        title="Create New Dashboard"
        isDarkMode={isDarkMode}
      >
        {/* Dashboard creation form */}
      </Modal>

      {/* Create Report Modal */}
      <Modal
        isOpen={showCreateReport}
        onClose={() => setShowCreateReport(false)}
        title="Create New Report"
        isDarkMode={isDarkMode}
      >
        {/* Report creation form */}
      </Modal>

      {/* Report Details Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Report Details"
        isDarkMode={isDarkMode}
      >
        {/* Report details view */}
      </Modal>
    </div>
  );
}