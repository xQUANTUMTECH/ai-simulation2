import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, MoreVertical, Edit, Trash2, 
  UserPlus, Download, Mail, Ban, CheckCircle, AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Modal } from '../Modal';
import { UserProfile } from './UserProfile';

interface UserManagementProps {
  isDarkMode: boolean;
}

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  account_status: string;
  created_at: string;
  last_active: string;
}

export function UserManagement({ isDarkMode }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, account_status: newStatus } : user
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating user status');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating user role');
    }
  };

  const handleBulkAction = async (action: 'delete' | 'suspend' | 'activate') => {
    try {
      const newStatus = action === 'delete' ? 'deleted' : action === 'suspend' ? 'suspended' : 'active';
      
      const { error } = await supabase
        .from('users')
        .update({ account_status: newStatus })
        .in('id', selectedUsers);

      if (error) throw error;

      setUsers(users.map(user => 
        selectedUsers.includes(user.id) ? { ...user, account_status: newStatus } : user
      ));
      setSelectedUsers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error performing bulk action');
    }
  };

  const handleExport = () => {
    const data = users.map(user => ({
      Username: user.username,
      Email: user.email,
      'Full Name': user.full_name,
      Role: user.role,
      Status: user.account_status,
      'Created At': new Date(user.created_at).toLocaleDateString(),
      'Last Active': new Date(user.last_active).toLocaleDateString()
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.account_status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
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
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Export CSV"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <UserPlus size={20} />
            Add User
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
            placeholder="Search users..."
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
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <option value="all">All Roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
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
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {selectedUsers.length > 0 && (
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>{selectedUsers.length} users selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                className="px-3 py-1 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
              >
                Suspend
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-xl border ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className="w-8 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3">
                  User
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3">
                  Role
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3">
                  Registered
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wider px-6 py-3">
                  Last Active
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      } cursor-pointer`}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowUserProfile(true);
                      }}>
                          <Users size={20} className="text-gray-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`px-3 py-1 rounded-full text-xs inline-flex items-center gap-1 ${
                      user.account_status === 'active'
                        ? 'bg-green-500 bg-opacity-10 text-green-500'
                        : user.account_status === 'suspended'
                        ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                        : 'bg-red-500 bg-opacity-10 text-red-500'
                    }`}>
                      {user.account_status === 'active' && <CheckCircle size={12} />}
                      {user.account_status === 'suspended' && <Ban size={12} />}
                      {user.account_status === 'deleted' && <Trash2 size={12} />}
                      {user.account_status}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(user.last_active).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowEditUser(user.id)}
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
                        <Mail size={16} />
                      </button>
                      <button
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Add New User"
        isDarkMode={isDarkMode}
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="john.doe@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="johndoe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Add User
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!showEditUser}
        onClose={() => setShowEditUser(null)}
        title="Edit User"
        isDarkMode={isDarkMode}
      >
        {showEditUser && (
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                defaultValue={users.find(u => u.id === showEditUser)?.full_name}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                defaultValue={users.find(u => u.id === showEditUser)?.email}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                defaultValue={users.find(u => u.id === showEditUser)?.username}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                defaultValue={users.find(u => u.id === showEditUser)?.role}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Account Status</label>
              <select
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
                defaultValue={users.find(u => u.id === showEditUser)?.account_status}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowEditUser(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* User Profile Modal */}
      <Modal
        isOpen={showUserProfile}
        onClose={() => {
          setShowUserProfile(false);
          setSelectedUserId(null);
        }}
        title="User Profile"
        isDarkMode={isDarkMode}
        fullscreen
      >
        {selectedUserId && (
          <UserProfile
            userId={selectedUserId}
            isDarkMode={isDarkMode}
            onClose={() => {
              setShowUserProfile(false);
              setSelectedUserId(null);
              loadUsers(); // Reload users list to reflect any changes
            }}
          />
        )}
      </Modal>
    </div>
  );
}