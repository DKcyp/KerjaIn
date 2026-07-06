"use client";

import React, { useState, useEffect } from 'react';
import { PermissionGate } from '@/components/rbac/PermissionGate';

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  _count: {
    userRoles: number;
  };
}

interface Permission {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  action: string;
  isActive: boolean;
  _count: {
    rolePermissions: number;
    userPermissions: number;
  };
}

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  permissionIds: number[];
}

interface PermissionFormData {
  name: string;
  displayName: string;
  description: string;
  module: string;
  action: string;
}

interface User {
  id: number;
  username: string;
  namaLengkap: string;
  role: string;
}

interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  role: {
    id: number;
    name: string;
    displayName: string;
  };
}

interface UserPermission {
  id: number;
  userId: number;
  permissionId: number;
  granted: boolean;
  permission: {
    id: number;
    name: string;
    displayName: string;
  };
}

export default function RBACManagementPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'permissions' | 'users'>('overview');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');
  
  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRolePermissionsModal, setShowRolePermissionsModal] = useState(false);
  const [showUserRolesModal, setShowUserRolesModal] = useState(false);
  const [showUserPermissionsModal, setShowUserPermissionsModal] = useState(false);
  
  // Assignment states
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  
  // Edit states
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deletingItem, setDeletingItem] = useState<{type: 'role' | 'permission', id: number, name: string} | null>(null);
  
  // Form states
  const [roleForm, setRoleForm] = useState<RoleFormData>({
    name: '',
    displayName: '',
    description: '',
    permissionIds: []
  });
  
  const [permissionForm, setPermissionForm] = useState<PermissionFormData>({
    name: '',
    displayName: '',
    description: '',
    module: '',
    action: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/permissions'),
        fetch('/api/pegawai')
      ]);

      if (!rolesRes.ok || !permissionsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();
      const usersData = await usersRes.json();

      setRoles(rolesData.roles || []);
      setPermissions(permissionsData.permissions || []);
      setUsers(usersData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Role CRUD functions
  const handleAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', displayName: '', description: '', permissionIds: [] });
    setFormErrors({});
    setShowRoleModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      permissionIds: [] // TODO: Fetch role permissions
    });
    setFormErrors({});
    setShowRoleModal(true);
  };

  const handleDeleteRole = (role: Role) => {
    setDeletingItem({ type: 'role', id: role.id, name: role.displayName });
    setShowDeleteModal(true);
  };

  const submitRole = async () => {
    setFormErrors({});
    
    // Validation
    const errors: Record<string, string> = {};
    if (!roleForm.name.trim()) errors.name = 'Name is required';
    if (!roleForm.displayName.trim()) errors.displayName = 'Display name is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const url = editingRole ? `/api/rbac/roles/${editingRole.id}` : '/api/rbac/roles';
      const method = editingRole ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save role');
      }

      setShowRoleModal(false);
      await fetchData();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  // Permission CRUD functions
  const handleAddPermission = () => {
    setEditingPermission(null);
    setPermissionForm({ name: '', displayName: '', description: '', module: '', action: '' });
    setFormErrors({});
    setShowPermissionModal(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description || '',
      module: permission.module,
      action: permission.action
    });
    setFormErrors({});
    setShowPermissionModal(true);
  };

  const handleDeletePermission = (permission: Permission) => {
    setDeletingItem({ type: 'permission', id: permission.id, name: permission.displayName });
    setShowDeleteModal(true);
  };

  const submitPermission = async () => {
    setFormErrors({});
    
    // Validation
    const errors: Record<string, string> = {};
    if (!permissionForm.name.trim()) errors.name = 'Name is required';
    if (!permissionForm.displayName.trim()) errors.displayName = 'Display name is required';
    if (!permissionForm.module.trim()) errors.module = 'Module is required';
    if (!permissionForm.action.trim()) errors.action = 'Action is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const url = editingPermission ? `/api/rbac/permissions/${editingPermission.id}` : '/api/rbac/permissions';
      const method = editingPermission ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save permission');
      }

      setShowPermissionModal(false);
      await fetchData();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete function
  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setSubmitting(true);
      const url = deletingItem.type === 'role' 
        ? `/api/rbac/roles/${deletingItem.id}`
        : `/api/rbac/permissions/${deletingItem.id}`;
      
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      setShowDeleteModal(false);
      setDeletingItem(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Assignment functions
  const handleManageRolePermissions = async (role: Role) => {
    setSelectedRole(role);
    try {
      const response = await fetch(`/api/rbac/roles/${role.id}?includePermissions=true`);
      if (response.ok) {
        const data = await response.json();
        const permissionIds = data.role.rolePermissions?.map((rp: any) => rp.permissionId) || [];
        setRolePermissions(permissionIds);
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
      setRolePermissions([]);
    }
    setShowRolePermissionsModal(true);
  };

  const handleManageUserRoles = async (user: User) => {
    setSelectedUser(user);
    try {
      const response = await fetch(`/api/rbac/users/${user.id}/roles`);
      if (response.ok) {
        const data = await response.json();
        setUserRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      setUserRoles([]);
    }
    setShowUserRolesModal(true);
  };

  const handleManageUserPermissions = async (user: User) => {
    setSelectedUser(user);
    try {
      const response = await fetch(`/api/rbac/users/${user.id}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
      setUserPermissions([]);
    }
    setShowUserPermissionsModal(true);
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/rbac/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedRole.name,
          displayName: selectedRole.displayName,
          description: selectedRole.description,
          permissionIds: rolePermissions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update role permissions');
      }

      setShowRolePermissionsModal(false);
      await fetchData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading RBAC data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <PermissionGate permission="rbac.manage" fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Access Denied: You don't have permission to manage RBAC</div>
      </div>
    }>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                🔐 Access Control Center
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage user roles, permissions, and system access
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {roles.length} Roles • {permissions.length} Permissions • {users.length} Users
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-medium rounded-l-lg transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Overview
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'roles'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Roles
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  {roles.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === 'permissions'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Permissions
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  {permissions.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-medium rounded-r-lg transition-colors ${
                  activeTab === 'users'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Users
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  {users.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">System Roles</h3>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-blue-100 text-sm">Active role definitions</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Permissions</h3>
                  <p className="text-2xl font-bold">{permissions.length}</p>
                  <p className="text-green-100 text-sm">Granular access controls</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Active Users</h3>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-purple-100 text-sm">System users</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('roles')}
                    className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Create New Role</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Define a new system role</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('users')}
                    className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Assign User Roles</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Manage user permissions</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('permissions')}
                    className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Review Permissions</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Audit system permissions</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Role Distribution</h4>
                    <div className="space-y-2">
                      {roles.slice(0, 5).map((role) => (
                        <div key={role.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{role.displayName}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{role._count.userRoles} users</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Permission Modules</h4>
                    <div className="space-y-2">
                      {Array.from(new Set(permissions.map(p => p.module))).slice(0, 5).map((module) => (
                        <div key={module} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{module}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {permissions.filter(p => p.module === module).length} permissions
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    System Roles
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage role definitions and their permissions
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button 
                    onClick={handleAddRole}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Role
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {roles
                      .filter(role => 
                        role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No roles found</h3>
                              <p className="text-gray-500 dark:text-gray-400 mb-4">
                                {searchTerm ? `No roles match "${searchTerm}"` : 'No roles have been created yet.'}
                              </p>
                              {!searchTerm && (
                                <button
                                  onClick={handleAddRole}
                                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Create First Role
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        roles
                          .filter(role => 
                            role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
                          )
                          .map((role) => (
                      <tr key={role.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {role.displayName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {role.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {role.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {role._count.userRoles} users
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            role.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {role.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleManageRolePermissions(role)}
                              className="inline-flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                              title="Manage role permissions"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Permissions
                            </button>
                            <button 
                              onClick={() => handleEditRole(role)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              title="Edit role details"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteRole(role)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                              title="Delete role"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                          ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    System Permissions
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage granular access permissions by module
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <select
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Modules</option>
                    {Array.from(new Set(permissions.map(p => p.module))).sort().map(module => (
                      <option key={module} value={module} className="capitalize">{module}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAddPermission}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Permission
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Permission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Module
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {permissions
                      .filter(permission => {
                        const matchesSearch = permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          permission.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          permission.action.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesModule = !filterModule || permission.module === filterModule;
                        return matchesSearch && matchesModule;
                      })
                      .map((permission) => (
                      <tr key={permission.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {permission.displayName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {permission.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                            {permission.module}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {permission.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {permission._count.rolePermissions} roles, {permission._count.userPermissions} users
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            permission.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {permission.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleEditPermission(permission)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePermission(permission)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    User Management
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Assign roles and manage user permissions
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Current Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users
                      .filter(user => 
                        user.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.role.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.namaLengkap}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.username} (ID: {user.id})
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleManageUserRoles(user)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Roles
                            </button>
                            <button 
                              onClick={() => handleManageUserPermissions(user)}
                              className="inline-flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Permissions
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h3>
              
              {formErrors.submit && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {formErrors.submit}
                </div>
              )}
              
              <form onSubmit={(e) => { e.preventDefault(); submitRole(); }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., project_manager"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={roleForm.displayName}
                    onChange={(e) => setRoleForm({...roleForm, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., Project Manager"
                  />
                  {formErrors.displayName && <p className="text-red-500 text-sm mt-1">{formErrors.displayName}</p>}
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Role description..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowRoleModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permission Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingPermission ? 'Edit Permission' : 'Add New Permission'}
              </h3>
              
              {formErrors.submit && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {formErrors.submit}
                </div>
              )}
              
              <form onSubmit={(e) => { e.preventDefault(); submitPermission(); }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permission Name *
                  </label>
                  <input
                    type="text"
                    value={permissionForm.name}
                    onChange={(e) => setPermissionForm({...permissionForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., project.create"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={permissionForm.displayName}
                    onChange={(e) => setPermissionForm({...permissionForm, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., Create Project"
                  />
                  {formErrors.displayName && <p className="text-red-500 text-sm mt-1">{formErrors.displayName}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Module *
                    </label>
                    <input
                      type="text"
                      value={permissionForm.module}
                      onChange={(e) => setPermissionForm({...permissionForm, module: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., project"
                    />
                    {formErrors.module && <p className="text-red-500 text-sm mt-1">{formErrors.module}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Action *
                    </label>
                    <input
                      type="text"
                      value={permissionForm.action}
                      onChange={(e) => setPermissionForm({...permissionForm, action: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., create"
                    />
                    {formErrors.action && <p className="text-red-500 text-sm mt-1">{formErrors.action}</p>}
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={permissionForm.description}
                    onChange={(e) => setPermissionForm({...permissionForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Permission description..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowPermissionModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingPermission ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Confirm Delete
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete the {deletingItem.type} "{deletingItem.name}"? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => { setShowDeleteModal(false); setDeletingItem(null); }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Permissions Modal */}
        {showRolePermissionsModal && selectedRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Manage Permissions for Role: {selectedRole.displayName}
              </h3>
              
              <div className="space-y-2 mb-6">
                {permissions.map((permission) => (
                  <label key={permission.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={rolePermissions.includes(permission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRolePermissions([...rolePermissions, permission.id]);
                        } else {
                          setRolePermissions(rolePermissions.filter(id => id !== permission.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {permission.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {permission.name} ({permission.module}.{permission.action})
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setShowRolePermissionsModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveRolePermissions}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Roles Modal */}
        {showUserRolesModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Manage Roles for User: {selectedUser.namaLengkap}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Roles:</p>
                {userRoles.length > 0 ? (
                  <div className="space-y-1">
                    {userRoles.map((userRole) => (
                      <div key={userRole.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <span className="text-sm">{userRole.role.displayName}</span>
                        <button 
                          onClick={async () => {
                            try {
                              await fetch(`/api/rbac/users/${selectedUser.id}/roles`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ roleId: userRole.roleId })
                              });
                              handleManageUserRoles(selectedUser);
                            } catch (error) {
                              console.error('Failed to remove role:', error);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No roles assigned</p>
                )}
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Add Role:</p>
                <select 
                  onChange={async (e) => {
                    if (e.target.value) {
                      try {
                        await fetch(`/api/rbac/users/${selectedUser.id}/roles`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ roleId: parseInt(e.target.value) })
                        });
                        handleManageUserRoles(selectedUser);
                        e.target.value = '';
                      } catch (error) {
                        console.error('Failed to add role:', error);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select a role to add...</option>
                  {roles.filter(role => !userRoles.some(ur => ur.roleId === role.id)).map(role => (
                    <option key={role.id} value={role.id}>{role.displayName}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowUserRolesModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Permissions Modal */}
        {showUserPermissionsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Manage Direct Permissions for User: {selectedUser.namaLengkap}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                These are direct permission overrides. Users also inherit permissions from their assigned roles.
              </p>
              
              <div className="space-y-2 mb-6">
                {permissions.map((permission) => {
                  const userPerm = userPermissions.find(up => up.permissionId === permission.id);
                  return (
                    <div key={permission.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {permission.displayName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {permission.name}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/rbac/users/${selectedUser.id}/permissions`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ permissionId: permission.id, granted: true })
                              });
                              handleManageUserPermissions(selectedUser);
                            } catch (error) {
                              console.error('Failed to grant permission:', error);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            userPerm?.granted 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                          }`}
                        >
                          Grant
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/rbac/users/${selectedUser.id}/permissions`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ permissionId: permission.id, granted: false })
                              });
                              handleManageUserPermissions(selectedUser);
                            } catch (error) {
                              console.error('Failed to deny permission:', error);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            userPerm && !userPerm.granted 
                              ? 'bg-red-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                          }`}
                        >
                          Deny
                        </button>
                        {userPerm && (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/rbac/users/${selectedUser.id}/permissions`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ permissionId: permission.id })
                                });
                                handleManageUserPermissions(selectedUser);
                              } catch (error) {
                                console.error('Failed to remove permission:', error);
                              }
                            }}
                            className="px-2 py-1 text-xs rounded bg-gray-400 text-white hover:bg-gray-500"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowUserPermissionsModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
