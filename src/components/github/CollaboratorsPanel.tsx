"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Collaborator {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  role_name: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

interface CollaboratorsPanelProps {
  repoFullName: string;
}

export default function CollaboratorsPanel({ repoFullName }: CollaboratorsPanelProps) {
  const { success, error: showError } = useToast();
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [githubUsername, setGithubUsername] = useState('');
  const [permission, setPermission] = useState<'pull' | 'push' | 'admin' | 'maintain' | 'triage'>('push');
  const [adding, setAdding] = useState(false);
  
  // Search/autocomplete state
  const [searchResults, setSearchResults] = useState<GitHubUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'cancel'; username: string; invitationId?: number } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Load collaborators and pending invitations
  const loadCollaborators = async () => {
    setLoading(true);
    try {
      // Load active collaborators
      const response = await fetch(`/api/github/collaborators/${encodeURIComponent(repoFullName)}`);
      
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators || []);
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to load collaborators');
      }

      // Load pending invitations
      const invitationsResponse = await fetch(`/api/github/invitations/${encodeURIComponent(repoFullName)}`);
      
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setPendingInvitations(invitationsData.invitations || []);
      } else {
        console.warn('Could not load pending invitations');
        setPendingInvitations([]);
      }
    } catch (err) {
      console.error('Error loading collaborators:', err);
      showError('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaborators();
  }, [repoFullName]);

  // Search GitHub users with debounce
  const searchGitHubUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/github/search-users?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
        setShowDropdown(data.users.length > 0);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  };

  // Handle username input change with debounce
  const handleUsernameChange = (value: string) => {
    setGithubUsername(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchGitHubUsers(value);
    }, 100);
  };

  // Handle user selection from dropdown
  const handleSelectUser = (user: GitHubUser) => {
    setGithubUsername(user.login);
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add collaborator
  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!githubUsername.trim()) {
      showError('Please enter a GitHub username');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/github/collaborators/${encodeURIComponent(repoFullName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: githubUsername.trim(), 
          permission,
        })
      });

      const data = await response.json();

      if (response.ok) {
        success(data.message || 'Invitation sent successfully');
        
        setGithubUsername('');
        setPermission('push');
        setShowAddModal(false);
        loadCollaborators();
      } else {
        showError(data.error || 'Failed to add collaborator');
      }
    } catch (err) {
      console.error('Error adding collaborator:', err);
      showError('Failed to add collaborator');
    } finally {
      setAdding(false);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (collaboratorUsername: string) => {
    setConfirmAction({ type: 'remove', username: collaboratorUsername });
    setShowConfirmModal(true);
  };

  // Confirm remove action
  const confirmRemoveCollaborator = async () => {
    if (!confirmAction) return;
    
    setIsConfirming(true);
    
    try {
      const response = await fetch(
        `/api/github/collaborators/${encodeURIComponent(repoFullName)}?username=${confirmAction.username}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        success(data.message || 'Collaborator removed successfully');
        setShowConfirmModal(false);
        setConfirmAction(null);
        loadCollaborators();
      } else {
        showError(data.error || 'Failed to remove collaborator');
      }
    } catch (err) {
      console.error('Error removing collaborator:', err);
      showError('Failed to remove collaborator');
    } finally {
      setIsConfirming(false);
    }
  };

  // Confirm cancel invitation
  const confirmCancelInvitation = async () => {
    if (!confirmAction || !confirmAction.invitationId) return;
    
    setIsConfirming(true);
    
    try {
      const response = await fetch(
        `/api/github/invitations/${encodeURIComponent(repoFullName)}?invitationId=${confirmAction.invitationId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        success(data.message || 'Invitation cancelled successfully');
        setShowConfirmModal(false);
        setConfirmAction(null);
        loadCollaborators();
      } else {
        showError(data.error || 'Failed to cancel invitation');
      }
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      showError('Failed to cancel invitation');
    } finally {
      setIsConfirming(false);
    }
  };

  // Get permission badge
  const getPermissionBadge = (collab: Collaborator) => {
    if (collab.permissions.admin) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm">
          Admin
        </span>
      );
    }
    if (collab.permissions.maintain) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm">
          Maintain
        </span>
      );
    }
    if (collab.permissions.push) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
          Write
        </span>
      );
    }
    if (collab.permissions.triage) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-sm">
          Triage
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm">
        Read
      </span>
    );
  };

  return (
    <div>
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 mb-6 border border-blue-100 dark:border-blue-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Team Collaborators
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage repository access and permissions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {collaborators.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Active Members
              </div>
            </div>
            {pendingInvitations.length > 0 && (
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {pendingInvitations.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Pending
                </div>
              </div>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="group px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Add Collaborator</h3>
                    <p className="text-cyan-100 text-sm">Invite a new team member</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setGithubUsername('');
                    setPermission('push');
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddCollaborator} className="p-6 space-y-5">
              {/* GitHub Username Input with Autocomplete */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  GitHub Username <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {searching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
                      <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  <input
                    type="text"
                    value={githubUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowDropdown(true);
                      }
                    }}
                    placeholder="e.g., octocat"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    disabled={adding}
                    required
                    autoComplete="off"
                  />
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.login}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-8 h-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate">
                              {user.login}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.type}
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {searching ? 'Searching GitHub users...' : 'Start typing to search GitHub users'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Permission Level
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as any)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    disabled={adding}
                  >
                    <option value="pull">👁️ Read - Can view and clone</option>
                    <option value="triage">🎯 Triage - Can manage issues</option>
                    <option value="push">✏️ Write - Can push changes</option>
                    <option value="maintain">⚙️ Maintain - Can manage repo</option>
                    <option value="admin">🛡️ Admin - Full access</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Invitation
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setGithubUsername('');
                    setPermission('push');
                  }}
                  disabled={adding}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collaborators List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent absolute top-0"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading collaborators...</p>
        </div>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="inline-flex p-4 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Collaborators Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Start building your team by adding collaborators</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Member
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Invitations Section */}
          {pendingInvitations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending Invitations ({pendingInvitations.length})
              </h3>
              <div className="grid gap-3 mb-6">
                {pendingInvitations.map((invitation, index) => (
                  <div
                    key={invitation.id}
                    className="group relative bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-800/30 transition-all shadow-sm"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-amber-200 dark:bg-amber-800/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm animate-pulse"></div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              {invitation.invitee?.login || 'Unknown'}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white">
                              Pending
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Invited {new Date(invitation.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setConfirmAction({ 
                            type: 'cancel', 
                            username: invitation.invitee?.login || 'Unknown',
                            invitationId: invitation.id 
                          });
                          setShowConfirmModal(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-all shadow-sm border border-gray-200 dark:border-gray-600"
                        title="Cancel invitation"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Collaborators Section */}
          <div>
            {collaborators.length > 0 && (
              <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Active Collaborators ({collaborators.length})
              </h3>
            )}
            <div className="grid gap-4">
              {collaborators.map((collab, index) => (
            <div
              key={collab.id}
              className="group relative bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all shadow-sm hover:shadow-lg transform hover:-translate-y-1"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar with status indicator */}
                  <div className="relative">
                    <img
                      src={collab.avatar_url}
                      alt={collab.login}
                      className="w-14 h-14 rounded-full ring-4 ring-gray-100 dark:ring-gray-700 group-hover:ring-blue-100 dark:group-hover:ring-blue-900/30 transition-all"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white dark:border-gray-800 shadow-sm"></div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={collab.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                      >
                        {collab.login}
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPermissionBadge(collab)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        • GitHub ID: {collab.id}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveCollaborator(collab.login)}
                  className="group/btn px-4 py-2 bg-red-50 hover:bg-red-500 dark:bg-red-900/20 dark:hover:bg-red-600 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                  title="Remove collaborator"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden group-hover/btn:inline">Remove</span>
                </button>
              </div>
            </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        show={showConfirmModal}
        title={confirmAction?.type === 'remove' ? 'Remove Collaborator' : 'Cancel Invitation'}
        message={
          confirmAction?.type === 'remove'
            ? `Are you sure you want to remove ${confirmAction.username} from this repository?\n\nThey will lose all access immediately and will need to be re-invited to regain access.`
            : `Are you sure you want to cancel the invitation for ${confirmAction?.username}?\n\nThey won't be able to accept this invitation and will need to be invited again.`
        }
        confirmText={confirmAction?.type === 'remove' ? 'Yes, Remove' : 'Yes, Cancel Invitation'}
        cancelText="No, Keep It"
        type={confirmAction?.type === 'remove' ? 'danger' : 'warning'}
        isLoading={isConfirming}
        onConfirm={() => {
          if (confirmAction?.type === 'remove') {
            confirmRemoveCollaborator();
          } else {
            confirmCancelInvitation();
          }
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
