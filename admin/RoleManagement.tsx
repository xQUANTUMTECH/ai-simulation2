import React, { useState, useEffect } from 'react';
import { Shield, Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { adminService, Permission, RolePermission } from '../../services/admin-service';

interface RoleManagementProps {
  isDarkMode: boolean;
}

export function RoleManagement({ isDarkMode }: RoleManagementProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const roles = ['ADMIN', 'USER'];

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all permissions
      const allPermissions = await adminService.getPermissions();
      setPermissions(allPermissions);

      // Load permissions for each role
      const permissionsMap = new Map<string, Set<string>>();
      for (const role of roles) {
        const rolePerms = await adminService.getRolePermissions(role);
        permissionsMap.set(role, new Set(rolePerms.map(p => p.id)));
      }
      setRolePermissions(permissionsMap);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (role: string, permissionId: string) => {
    setRolePermissions(prev => {
      const newMap = new Map(prev);
      const rolePerms = new Set(prev.get(role));
      
      if (rolePerms.has(permissionId)) {
        rolePerms.delete(permissionId);
      } else {
        rolePerms.add(permissionId);
      }
      
      newMap.set(role, rolePerms);
      return newMap;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Save permissions for each role
      for (const role of roles) {
        const permissions = Array.from(rolePermissions.get(role) || []);
        await adminService.updateRolePermissions(role, permissions);
      }

      setSuccessMessage('Permissions updated successfully');
      await adminService.logAdminAction(
        'update_permissions',
        'role_permissions',
        'all',
        { roles: Array.from(rolePermissions.entries()) }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving permissions');
    } finally {
      setSaving(false);
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
        <h2 className="text-2xl font-bold">Role Management</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          Save Changes
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg flex items-center gap-2 text-green-500">
          <Shield size={20} />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map(role => (
          <div
            key={role}
            className={`p-6 rounded-xl border ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}
          >
            <h3 className="text-lg font-medium mb-4">{role}</h3>
            
            <div className="space-y-4">
              {Object.entries(
                permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
                  if (!acc[perm.category]) acc[perm.category] = [];
                  acc[perm.category].push(perm);
                  return acc;
                }, {})
              ).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-400 mb-2 capitalize">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {perms.map(permission => (
                      <label
                        key={permission.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="font-medium">{permission.name}</p>
                          <p className="text-sm text-gray-400">{permission.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={rolePermissions.get(role)?.has(permission.id) || false}
                          onChange={() => handlePermissionToggle(role, permission.id)}
                          className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}