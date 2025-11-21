'use client';

import { useEffect, useState } from 'react';
import { Activity, User, FileText, Link2, Users, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

interface ActivityFeedProps {
  workspaceId: string;
  limit?: number;
}

export default function ActivityFeed({ workspaceId, limit = 50 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadActivities();
    
    // Subscribe to new activities
    const channel = supabase
      .channel(`activity:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId]);

  const loadActivities = async () => {
    const { data, error } = await fetch(
      `/api/workspaces/${workspaceId}/activity?limit=${limit}`
    ).then((res) => res.json());

    if (!error && data.activities) {
      setActivities(data.activities);
    }
    setLoading(false);
  };

  const getActivityIcon = (action: string, entityType: string) => {
    if (entityType === 'node') return <FileText className="w-4 h-4" />;
    if (entityType === 'edge') return <Link2 className="w-4 h-4" />;
    if (entityType === 'workspace_member') return <Users className="w-4 h-4" />;
    if (entityType === 'comment') return <Activity className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getActivityMessage = (activity: Activity): string => {
    const userName = activity.user?.name || activity.user?.email || 'Someone';
    const action = activity.action.replace(/_/g, ' ');

    switch (activity.entity_type) {
      case 'node':
        return `${userName} ${action} a node`;
      case 'edge':
        return `${userName} ${action} a connection`;
      case 'workspace_member':
        return `${userName} ${action} a member`;
      case 'comment':
        return `${userName} ${action} on a node`;
      default:
        return `${userName} ${action}`;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-slate-400 text-sm">Loading activity...</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
        <Activity className="w-5 h-5 text-slate-300" />
        <h3 className="text-sm font-semibold text-slate-300">Recent Activity</h3>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto px-4">
        {activities.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-sm">
            No activity yet
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-300 flex-shrink-0">
                {getActivityIcon(activity.action, activity.entity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">{getActivityMessage(activity)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
