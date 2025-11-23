/**
 * Native Window Widget Component
 * Embeds native desktop applications using OS-level window embedding
 * Requires: Native Node.js C++ Addon for SetParent API (Windows) or equivalent (macOS)
 */

'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Monitor, AlertCircle, RefreshCw } from 'lucide-react';

interface NativeWindowWidgetProps extends WidgetProps {
  // Native window specific props
  processName?: string;
  windowTitle?: string;
  windowHandle?: number; // OS window handle
}

function NativeWindowWidget(props: NativeWindowWidgetProps) {
  const { data } = props;
  const node = data.node;
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Extract native window config from node content
  const windowConfig = typeof node.content === 'object' && node.content?.type === 'native-window-widget'
    ? {
        processName: node.content.processName || '',
        windowTitle: node.content.windowTitle || '',
        windowHandle: node.content.windowHandle,
      }
    : {
        processName: '',
        windowTitle: '',
        windowHandle: undefined,
      };

  const [isEmbedded, setIsEmbedded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if native window embedding is available
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
  const hasNativeEmbedding = isElectron && (window as any).electronAPI?.embedNativeWindow;

  useEffect(() => {
    if (!hasNativeEmbedding) {
      setError('Native window embedding requires Electron with native addons');
      return;
    }

    if (!windowConfig.processName && !windowConfig.windowHandle) {
      setError('Process name or window handle required');
      return;
    }

    // Attempt to embed the native window
    const embedWindow = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (containerRef.current) {
          const containerId = `native-window-${node.id}`;
          containerRef.current.setAttribute('data-container-id', containerId);
          
          const result = await (window as any).electronAPI.embedNativeWindow({
            containerId,
            processName: windowConfig.processName,
            windowTitle: windowConfig.windowTitle,
            windowHandle: windowConfig.windowHandle,
          });
          
          if (result.success) {
            setIsEmbedded(true);
          } else {
            setError(result.error || 'Failed to embed window');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to embed native window');
      } finally {
        setIsLoading(false);
      }
    };

    embedWindow();

    // Cleanup on unmount
    return () => {
      if (isEmbedded && containerRef.current) {
        const containerId = containerRef.current.getAttribute('data-container-id');
        if (containerId && (window as any).electronAPI?.unembedNativeWindow) {
          (window as any).electronAPI.unembedNativeWindow({ containerId });
        }
      }
    };
  }, [hasNativeEmbedding, windowConfig, node.id, isEmbedded]);

  const handleRefresh = useCallback(() => {
    setIsEmbedded(false);
    setError(null);
    // Trigger re-embed
    const event = new CustomEvent('refresh-native-window', { detail: { nodeId: node.id } });
    window.dispatchEvent(event);
  }, [node.id]);

  return (
    <BaseWidget
      {...props}
      title={node.title || windowConfig.windowTitle || 'Native App'}
      icon={<Monitor className="w-4 h-4" />}
      className="native-window-widget"
    >
      {error ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {error}
          </p>
          {hasNativeEmbedding && (
            <button
              onClick={handleRefresh}
              className="mt-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Embedding window...
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full h-full bg-gray-100 dark:bg-gray-900"
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Native window will be embedded here by Electron main process */}
          {isEmbedded && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
              Native window embedded
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}

export default memo(NativeWindowWidget);

