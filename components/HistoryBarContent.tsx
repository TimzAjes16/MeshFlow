'use client';

import { History, GripVertical } from 'lucide-react';
import { useHistoryStore } from '@/state/historyStore';
import { useState, useRef, useEffect } from 'react';
import type { HistoryEntry } from '@/state/historyStore';

export default function HistoryBarContent() {
  const { past, future, getHistory } = useHistoryStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const headerRef = useRef<HTMLDivElement>(null);

  const history = getHistory();
  const totalHistoryCount = past.length + future.length;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Handle dragging to detach from sidebar
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (headerRef.current && e.target === headerRef.current || (e.target as HTMLElement).closest('[data-grip-handle]')) {
      const rect = headerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!headerRef.current) return;
      
      const sidebar = document.querySelector('[class*="border-r"][class*="w-80"], [class*="border-r"][class*="w-12"]') as HTMLElement;
      const sidebarRect = sidebar?.getBoundingClientRect();
      
      if (!sidebarRect) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Check if dragged far enough from sidebar to detach
      const distanceFromSidebar = Math.abs(newX - sidebarRect.right);
      const detachThreshold = 60; // pixels - easy threshold for detachment
      
      if (distanceFromSidebar > detachThreshold) {
        // Detach by dispatching event to restore floating bar
        setIsDragging(false);
        localStorage.setItem('historyBarAttached', 'false');
        
        // Set floating bar position at new location
        const floatingBar = {
          x: Math.max(50, Math.min(newX, window.innerWidth - 300)),
          y: Math.max(50, Math.min(newY, window.innerHeight - 100)),
        };
        localStorage.setItem('historyBarPosition', JSON.stringify(floatingBar));
        
        // Dispatch event to detach and show floating bar
        window.dispatchEvent(new CustomEvent('history-bar-attached', { 
          detail: { 
            attached: false,
            position: floatingBar
          } 
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div className="flex flex-col h-full">
      {/* History Header - draggable to detach */}
      <div
        ref={headerRef}
        onMouseDown={handleHeaderMouseDown}
        className={`px-4 py-3 border-b border-gray-200 bg-slate-50 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none ${
          isDragging ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-100'
        } transition-colors`}
        title="Drag grip icon to detach and move to floating position"
      >
        <div data-grip-handle className="flex-shrink-0">
          <GripVertical className="w-4 h-4 text-gray-500 hover:text-gray-700" />
        </div>
        <History className="w-4 h-4 text-slate-600 flex-shrink-0" />
        <h2 className="text-sm font-semibold text-slate-900 flex-1">History</h2>
        <span className="text-xs text-gray-500">({totalHistoryCount})</span>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-2">
        {history.length === 0 ? (
          <div className="px-2 py-4 text-sm text-gray-400 text-center">No history yet</div>
        ) : (
          <div className="space-y-1">
            {history.map((entry: HistoryEntry) => {
              const isInFuture = future.some(f => f.id === entry.id);
              return (
                <div
                  key={entry.id}
                  className={`px-2 py-1.5 rounded text-sm transition-colors ${
                    isInFuture
                      ? 'text-gray-400 bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex-1 truncate">{entry.description}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

