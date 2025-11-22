'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
// import { createClient } from '@/lib/supabase/client'; // Commented out - supabase client not properly configured
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  node_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

interface CommentsPanelProps {
  nodeId: string;
  workspaceId: string;
  onClose: () => void;
}

export default function CommentsPanel({
  nodeId,
  workspaceId,
  onClose,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // const supabase = createClient(); // Commented out - supabase client not properly configured

  useEffect(() => {
    loadComments();
    
    // Subscribe to new comments - commented out until supabase client is properly configured
    // const channel = supabase
    //   .channel(`comments:${nodeId}`)
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'comments',
    //       filter: `node_id=eq.${nodeId}`,
    //     },
    //     () => {
    //       loadComments();
    //     }
    //   )
    //   .subscribe();

    // return () => {
    //   channel.unsubscribe();
    // };
  }, [nodeId]);

  const loadComments = async () => {
    // TODO: Replace with API route when supabase client is properly configured
    try {
      const response = await fetch(`/api/nodes/${nodeId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
    setLoading(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    // TODO: Replace with API route when supabase client is properly configured
    try {
      const response = await fetch(`/api/nodes/${nodeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });
      
      if (response.ok) {
        setNewComment('');
        await loadComments();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string, userId: string) => {
    if (!confirm('Delete this comment?')) return;

    // TODO: Replace with API route when supabase client is properly configured
    try {
      const response = await fetch(`/api/nodes/${nodeId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex items-center justify-center">
        <div className="text-slate-400">Loading comments...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-100">Comments</h2>
          <span className="px-2 py-0.5 text-xs bg-slate-800 rounded-full text-slate-400">
            {comments.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
        >
          ×
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {comments.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => {
              // TODO: Get current user from session when supabase client is properly configured
              // const {
              //   data: { user },
              // } = supabase.auth.getUser();
              // const isOwner = user && user.id === comment.user_id;
              const isOwner = false; // Temporarily disabled

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {comment.profile?.name?.[0] || comment.profile?.email?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-200">
                          {comment.profile?.name || comment.profile?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                          className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </motion.div>
  );
}
