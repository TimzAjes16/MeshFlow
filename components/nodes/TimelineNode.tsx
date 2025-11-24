/**
 * Timeline Node Component
 * Renders a timeline builder
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Calendar, Plus, X } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface TimelineNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface TimelineContent {
  type: 'timeline';
  events: Array<{ id: string; date: string; title: string; description: string }>;
}

function TimelineNode({ data, selected, id }: TimelineNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const timelineContent: TimelineContent = typeof node.content === 'object' && node.content?.type === 'timeline'
    ? node.content
    : { 
        type: 'timeline', 
        events: [],
      };

  const [events, setEvents] = useState(timelineContent.events || []);

  useEffect(() => {
    const updateTimeline = () => {
      updateNode(id, {
        content: {
          type: 'timeline',
          events,
        },
      });

      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            content: {
              type: 'timeline',
              events,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateTimeline, 500);
    return () => clearTimeout(timer);
  }, [id, events, updateNode]);

  const handleAddEvent = useCallback(() => {
    const newEvent = {
      id: `event-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      title: 'New Event',
      description: '',
    };
    setEvents((prev) => [...prev, newEvent]);
  }, []);

  const handleRemoveEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const handleUpdateEvent = useCallback((eventId: string, field: string, value: string) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, [field]: value } : e)));
  }, []);

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4 w-full h-full flex flex-col gap-3"
        style={{
          minWidth: node.width || 500,
          minHeight: node.height || 300,
        }}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-700" />
          <span className="font-semibold text-sm text-teal-800">Timeline</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No events yet. Add an event to get started.
              </div>
            ) : (
              events.map((event, index) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-teal-500 rounded-full" />
                    {index < events.length - 1 && (
                      <div className="w-0.5 h-full bg-teal-300 min-h-[60px]" />
                    )}
                  </div>
                  <div className="flex-1 bg-white border border-teal-300 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="date"
                        value={event.date}
                        onChange={(e) => handleUpdateEvent(event.id, 'date', e.target.value)}
                        className="px-2 py-1 border border-teal-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        disabled={!selected}
                      />
                      {selected && (
                        <button
                          onClick={() => handleRemoveEvent(event.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={event.title}
                      onChange={(e) => handleUpdateEvent(event.id, 'title', e.target.value)}
                      className="w-full px-2 py-1 border border-teal-200 rounded text-sm font-semibold text-gray-900 mb-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="Event title"
                      disabled={!selected}
                    />
                    <textarea
                      value={event.description}
                      onChange={(e) => handleUpdateEvent(event.id, 'description', e.target.value)}
                      className="w-full px-2 py-1 border border-teal-200 rounded text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="Event description"
                      rows={2}
                      disabled={!selected}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selected && (
          <button
            onClick={handleAddEvent}
            className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded text-sm font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(TimelineNode);

