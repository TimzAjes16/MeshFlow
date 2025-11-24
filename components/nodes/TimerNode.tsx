/**
 * Timer Node Component
 * Renders an editable timer with countdown functionality
 */

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Clock, Play, Pause, Square } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface TimerNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface TimerContent {
  type: 'timer';
  duration: number; // Duration in seconds
  isRunning: boolean;
  timeRemaining: number; // Current time remaining in seconds
  startTime?: number; // Timestamp when timer started
}

function TimerNode({ data, selected, id }: TimerNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Extract timer content
  const timerContent: TimerContent = typeof node.content === 'object' && node.content?.type === 'timer'
    ? node.content
    : { 
        type: 'timer', 
        duration: 300, // 5 minutes default
        isRunning: false,
        timeRemaining: 300,
      };

  const [duration, setDuration] = useState(timerContent.duration);
  const [isRunning, setIsRunning] = useState(timerContent.isRunning);
  const [timeRemaining, setTimeRemaining] = useState(
    timerContent.timeRemaining || timerContent.duration
  );
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update timer every second when running
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  // Persist timer state to node
  useEffect(() => {
    const updateTimer = () => {
      updateNode(id, {
        content: {
          type: 'timer',
          duration,
          isRunning,
          timeRemaining,
        },
      });

      // Also update via API
      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            content: {
              type: 'timer',
              duration,
              isRunning,
              timeRemaining,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateTimer, 500);
    return () => clearTimeout(timer);
  }, [id, duration, isRunning, timeRemaining, updateNode]);

  const handlePlayPause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(duration);
  }, [duration]);

  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setDuration(value);
    if (!isRunning) {
      setTimeRemaining(value);
    }
  }, [isRunning]);

  const handleDurationBlur = useCallback(() => {
    setIsEditingDuration(false);
    if (duration < 1) {
      setDuration(300);
      setTimeRemaining(300);
    }
  }, [duration]);

  const isExpired = timeRemaining === 0;

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-white border border-gray-200/50 rounded-md p-3 w-full h-full flex flex-col items-center justify-center gap-3 transition-all duration-150 hover:border-gray-300/50"
        style={{
          minWidth: node.width || 200,
          minHeight: node.height || 150,
        }}
      >
        <div className="flex items-center gap-2 text-yellow-800">
          <Clock className="w-5 h-5" />
          <span className="font-semibold text-sm">Timer</span>
        </div>

        {isEditingDuration && selected ? (
          <input
            type="number"
            value={duration}
            onChange={handleDurationChange}
            onBlur={handleDurationBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDurationBlur();
              }
            }}
            className="text-3xl font-bold text-center w-24 bg-white border border-yellow-300 rounded px-2 py-1"
            placeholder="300"
            min="1"
            autoFocus
          />
        ) : (
          <div
            className={`text-4xl font-bold ${
              isExpired ? 'text-red-600' : 'text-yellow-900'
            }`}
            onClick={() => selected && setIsEditingDuration(true)}
            style={{ cursor: selected ? 'pointer' : 'default' }}
            title={selected ? 'Click to edit duration' : ''}
          >
            {formatTime(timeRemaining)}
          </div>
        )}

        {selected && !isEditingDuration && (
          <div className="text-xs text-yellow-700">
            Duration: {formatTime(duration)} (click time to edit)
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handlePlayPause}
            disabled={isExpired}
            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-1 transition-colors"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded text-sm font-medium flex items-center gap-1 transition-colors"
          >
            <Square className="w-4 h-4" />
            Reset
          </button>
        </div>

        {isExpired && (
          <div className="text-red-600 font-semibold text-sm animate-pulse">
            Time's Up!
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(TimerNode);

