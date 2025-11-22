'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Users, Trash2, UserPlus } from 'lucide-react';

interface WorkspaceSettingsPageClientProps {
  workspace: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string | null;
      email: string;
    };
    members: Array<{
      userId: string;
      role: 'owner' | 'editor' | 'viewer';
      user: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      };
    }>;
    _count: {
      nodes: number;
      edges: number;
    };
  };
  userRole: 'owner' | 'editor' | 'viewer';
}

export default function WorkspaceSettingsPageClient({ workspace, userRole }: WorkspaceSettingsPageClientProps) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update workspace');
        return;
      }

      setSuccess('Workspace updated successfully');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: 'editor',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to invite member');
        return;
      }

      setSuccess('Invitation sent successfully');
      setInviteEmail('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete workspace');
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              type="button"
              onClick={() => router.push(`/workspace/${workspace.id}/canvas`)}
              className="flex items-center gap-2 text-sm text-black hover:text-black mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Canvas
            </button>
            <h1 className="text-3xl font-bold text-black">Workspace Settings</h1>
            <p className="mt-2 text-black">Manage workspace settings and members</p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="space-y-6">
            {/* Workspace Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-black mb-6">Workspace Information</h2>

              <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                <div>
                  <label htmlFor="workspaceName" className="block text-sm font-medium text-black mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    id="workspaceName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-black">Nodes</p>
                    <p className="text-2xl font-bold text-black">{workspace._count.nodes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">Connections</p>
                    <p className="text-2xl font-bold text-black">{workspace._count.edges}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !userRole.includes('owner')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </form>
            </div>

            {/* Members Section */}
            {userRole === 'owner' && (
              <>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-black">Members</h2>
                  </div>

                  {/* Invite Member */}
                  <form onSubmit={handleInviteMember} className="mb-6 pb-6 border-b border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Email address"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite
                      </button>
                    </div>
                  </form>

                  {/* Members List */}
                  <div className="space-y-3">
                    {/* Owner */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {workspace.owner.name?.[0]?.toUpperCase() || workspace.owner.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black">
                            {workspace.owner.name || workspace.owner.email}
                          </p>
                          <p className="text-xs text-black">{workspace.owner.email}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                        Owner
                      </span>
                    </div>

                    {/* Members */}
                    {workspace.members.map((member) => (
                      <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black">
                              {member.user.name || member.user.email}
                            </p>
                            <p className="text-xs text-black">{member.user.email}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-black rounded-full capitalize">
                          {member.role}
                        </span>
                      </div>
                    ))}

                    {workspace.members.length === 0 && (
                      <p className="text-sm text-black text-center py-4">No members yet</p>
                    )}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-lg border border-red-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-black">Danger Zone</h2>
                      <p className="text-sm text-black">Irreversible and destructive actions</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <h3 className="text-sm font-medium text-black">Delete Workspace</h3>
                      <p className="text-sm text-black">Once you delete this workspace, there is no going back.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteWorkspace}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete Workspace
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

