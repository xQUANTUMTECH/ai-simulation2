import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, RefreshCw, CheckCircle2, 
  Clock, X, Search, Filter 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Modal } from '../Modal';

interface RoleAssignmentProps {
  isDarkMode: boolean;
}

interface RoleRequest {
  id: string;
  user_id: string;
  user: {
    email: string;
    full_name: string;
  };
  requested_role: string;
  current_role: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function RoleAssignment({ isDarkMode }: RoleAssignmentProps) {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('role_assignment_requests')
        .select(`
          *,
          user:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedRequest) return;

    try {
      const { error: updateError } = await supabase
        .from('role_assignment_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      if (approved) {
        // Create role assignment
        const { error: assignError } = await supabase
          .from('role_assignments')
          .insert({
            user_id: selectedRequest.user_id,
            role: selectedRequest.requested_role,
            assigned_by: (await supabase.auth.getUser()).data.user?.id,
            reason: `Role request approved: ${reviewNotes}`
          });

        if (assignError) throw assignError;
      }

      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reviewing request');
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
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
        <h2 className="text-2xl font-bold">Role Assignment Requests</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredRequests.map(request => (
          <div
            key={request.id}
            className={`p-6 rounded-xl border ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">{request.user.full_name}</h3>
                <p className="text-sm text-gray-400">{request.user.email}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${
                request.status === 'pending'
                  ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                  : request.status === 'approved'
                  ? 'bg-green-500 bg-opacity-10 text-green-500'
                  : 'bg-red-500 bg-opacity-10 text-red-500'
              }`}>
                {request.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-400">Current Role</p>
                <p className="font-medium">{request.current_role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Requested Role</p>
                <p className="font-medium">{request.requested_role}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400">Reason</p>
              <p className="mt-1">{request.reason}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock size={16} />
                <span>{new Date(request.created_at).toLocaleString()}</span>
              </div>
              
              {request.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowReviewModal(true);
                    }}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Review Request
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedRequest(null);
          setReviewNotes('');
        }}
        title="Review Role Request"
        isDarkMode={isDarkMode}
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-400">User</p>
              <p className="font-medium">{selectedRequest.user.full_name}</p>
              <p className="text-sm text-gray-400">{selectedRequest.user.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Current Role</p>
                <p className="font-medium">{selectedRequest.current_role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Requested Role</p>
                <p className="font-medium">{selectedRequest.requested_role}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">Request Reason</p>
              <p className="mt-1">{selectedRequest.reason}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className={`w-full h-32 px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-200'
                }`}
                placeholder="Enter your review notes..."
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleReview(false)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}