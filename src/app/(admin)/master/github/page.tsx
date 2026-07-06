"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Loader2, Plus, Trash2, Key, Github, Edit } from "lucide-react";

interface GitHubCredential {
    id: string;
    name: string;
    username: string;
    token: string;
    expiresAt: string;
    createdAt: string;
}

export default function MasterGitHubPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [credentials, setCredentials] = useState<GitHubCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newToken, setNewToken] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Edit State
    const [editingCredential, setEditingCredential] = useState<GitHubCredential | null>(null);
    const [editName, setEditName] = useState("");
    const [editUsername, setEditUsername] = useState("");

    // Delete State
    const [deletingCredential, setDeletingCredential] = useState<GitHubCredential | null>(null);

    useEffect(() => {
        fetchCredentials();
    }, []);

    const fetchCredentials = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/master/github");
            if (!res.ok) throw new Error("Failed to fetch credentials");
            const data = await res.json();
            setCredentials(data);
        } catch (error) {
            // Using native alert instead of toast/sonner
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newUsername || !newToken) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch("/api/master/github", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    username: newUsername,
                    token: newToken,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create credential");
            }

            alert("GitHub credential added & activated successfully");
            setIsCreating(false);
            setNewName("");
            setNewUsername("");
            setNewToken("");
            fetchCredentials();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };



    const handleEdit = (cred: GitHubCredential) => {
        setEditingCredential(cred);
        setEditName(cred.name);
        setEditUsername(cred.username);
    };

    const handleUpdate = async () => {
        if (!editName || !editUsername) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch("/api/master/github", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingCredential?.id,
                    name: editName,
                    username: editUsername,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update credential");
            }

            toast.success("Credential updated successfully");
            setEditingCredential(null);
            fetchCredentials();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingCredential) return;

        try {
            const res = await fetch(`/api/master/github?id=${deletingCredential.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete credential");

            toast.success("Credential deleted");
            setDeletingCredential(null);
            fetchCredentials();
        } catch (error) {
            toast.error("Failed to delete credential");
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    // Frontend role check
    if (user?.role !== "SUPER_ADMIN") {
        return (
            <div className="p-8 text-center text-red-500">
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-gray-600">Only Super Admins can access this page.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl shadow-sm">
                            <Github className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            GitHub Credentials
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 ml-1">
                        Manage personal access tokens for system-wide GitHub integrations.
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreating(!isCreating)}
                    className={`${isCreating ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:scale-105`}
                >
                    {isCreating ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> Add Credential</>}
                </Button>
            </div>

            {/* Smooth Expand Create Form */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCreating ? 'max-h-[800px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'}`}>
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-blue-100 dark:border-slate-700 p-8 shadow-xl shadow-blue-500/5">
                    <div className="mb-4">
                        <h3 className="text-lg font-medium">Add New Credential</h3>
                        <p className="text-sm text-gray-500">
                            Enter a new GitHub Personal Access Token. This will automatically become the active token and deactivate others.
                        </p>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Credential Name</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                                    placeholder="e.g. Main Bot Account"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">GitHub Username</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                                    placeholder="e.g. my-bot-user"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Personal Access Token (PAT)</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800 pr-10 font-mono"
                                    placeholder="ghp_..."
                                    value={newToken}
                                    onChange={(e) => setNewToken(e.target.value)}
                                />
                                <Key className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500">
                                Token is only visible during creation. It will be masked after saving.
                            </p>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save & Activate
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        Existing Credentials <Badge variant="light" color="info">{credentials.length}</Badge>
                    </h3>
                </div>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                            <tr className="border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50 dark:hover:bg-slate-800/50">
                                <th className="h-12 px-6 text-left align-middle font-medium text-gray-500 uppercase tracking-wider text-xs">Name</th>
                                <th className="h-12 px-6 text-left align-middle font-medium text-gray-500 uppercase tracking-wider text-xs">Username</th>
                                <th className="h-12 px-6 text-right align-middle font-medium text-gray-500 uppercase tracking-wider text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {credentials.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center py-8 text-gray-500">
                                        No credentials found. Add one to get started.
                                    </td>
                                </tr>
                            ) : (
                                credentials.map((cred) => (
                                    <tr key={cred.id} className="group transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10">
                                        <td className="p-6 align-middle font-medium text-gray-900 dark:text-white">
                                            {cred.name}
                                        </td>
                                        <td className="p-6 align-middle">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                <Github className="w-4 h-4 text-gray-400" />
                                                {cred.username}
                                            </div>
                                        </td>
                                        <td className="p-6 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-indigo-100 hover:text-indigo-600 h-9 w-9 text-indigo-500"
                                                    onClick={() => handleEdit(cred)}
                                                    title="Edit"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-red-100 hover:text-red-600 h-9 w-9 text-red-500"
                                                    onClick={() => setDeletingCredential(cred)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
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

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingCredential}
                onClose={() => setEditingCredential(null)}
                className="max-w-md"
            >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 transform transition-all duration-300 ease-out">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Edit className="w-5 h-5 text-indigo-600" />
                            Edit Credential
                        </h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Name
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username / Organization
                            </label>
                            <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                            />
                        </div>
                        <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button
                                onClick={() => setEditingCredential(null)}
                                className="bg-gray-500 hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleUpdate} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105">
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingCredential}
                onClose={() => setDeletingCredential(null)}
                className="max-w-md"
            >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 transform transition-all duration-300 ease-out">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4 transform transition-all duration-300 hover:scale-110">
                            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Delete Credential
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete <span className="font-semibold text-red-600 dark:text-red-400">{deletingCredential?.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-center pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button
                                onClick={() => setDeletingCredential(null)}
                                className="bg-gray-500 hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700 transition-all duration-200 transform hover:scale-105"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
