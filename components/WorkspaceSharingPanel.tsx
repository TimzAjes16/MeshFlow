'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, X, Copy, Trash2, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceMember {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  profile?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

interface WorkspaceInvite {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  token: string;
  expires_at: string;
  created_at: string;
}

interface WorkspaceSharingPanelProps {
  workspaceId: string;
  isOwner: boolean;
  onClose: () => void;
}

export default function WorkspaceSharingPanel({
  workspaceId,
  isOwner,
  onClose,
}: WorkspaceSharingPanelProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadMembers();
    loadInvites();
  }, [workspaceId]);

  const loadMembers = async () => {
    const { data, error } = await fetch(`/api/workspaces/${workspaceId}/members`)
      .then((res) => res.json());

    if (!error && data.members) {
      setMembers(data.members);
    }
    setLoading(false);
  };

  const loadInvites = async () => {
    const { data, error } = await fetch(`/api/workspaces/${workspaceId}/invites`)
      .then((res) => res.json());

    if (!error && data.invites) {
      setInvites(data.invites);
    }
  };

  const handleCreateInvite = async () => {
    if (!inviteEmail.trim()) return;

    setCreatingInvite(true);
    const { data, error } = await fetch(`/api/workspaces/${workspaceId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail.trim(),
        role: inviteRole,
        expiresInDays: 7,
      }),
    }).then((res) => res.json());

    if (!error && data.invite) {
      setInvites([...invites, data.invite]);
      setInviteEmail('');
    }
    setCreatingInvite(false);
  };

  const handleCopyInviteLink = (inviteUrl: string) => {
    navigator.clipboard.writeText(inviteUrl);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;

    const { error } = await fetch(
      `/api/workspaces/${workspaceId}/members?userId=${userId}`,
      { method: 'DELETE' }
    ).then((res) => res.json());

    if (!error) {
      setMembers(members.filter((m) => m.user_id !== userId));
    }
  };

  const handleUpdateRole = async (userId: string, role: 'editor' | 'viewer') => {
    const { error } = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    }).then((res) => res.json());

    if (!error) {
      setMembers(
        members.map((m) => (m.user_id === userId ? { ...m, role } : m))
      );
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-500/20 text-purple-300',
      editor: 'bg-blue-500/20 text-blue-300',
      viewer: 'bg-gray-500/20 text-gray-300',
    };
    return colors[role] || colors.viewer;
  };

  if (loading) {
    return (
      <div className="w-96 h-full bg-slate-900 border-l border-slate-700 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="w-96 h-full bg-slate-900 border-l border-slate-700 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-100">Workspace Sharing</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Members */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Members</h3>
          <div className="space-y-2">
            <AnimatePresence>
              {members.map((member) => (
                <motion.div
                  key={member.user_id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                      {member.profile?.name?.[0] || member.profile?.email?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate">
                        {member.profile?.name || member.profile?.email || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {member.profile?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(member.role)}`}
                    >
                      {member.role}
                    </span>
                    {isOwner && member.role !== 'owner' && (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateRole(
                              member.user_id,
                              e.target.value as 'editor' | 'viewer'
                            )
                          }
                          className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-200"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-1 hover:bg-slate-700 rounded text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Invite Link */}
        {isOwner && (
          <>
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invite by Email
              </h3>
              <div className="space-y-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="editor">Editor - Can edit nodes</option>
                  <option value="viewer">Viewer - Read only</option>
                </select>
                <button
                  onClick={handleCreateInvite}
                  disabled={!inviteEmail.trim() || creatingInvite}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {creatingInvite ? 'Creating...' : 'Send Invite'}
                </button>
              </div>
            </div>

            {/* Active Invites */}
            {invites.length > 0 && (
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  Pending Invites
                </h3>
                <div className="space-y-2">
                  {invites.map((invite) => {
                    const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
                    return (
                      <div
                        key={invite.id}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-slate-200">{invite.email}</div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(invite.role)}`}
                          >
                            {invite.role}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyInviteLink(inviteUrl)}
                          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200"
                        >
                          <Copy className="w-3 h-3" />
                          Copy invite link
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
