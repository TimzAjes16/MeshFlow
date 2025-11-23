/**
 * WebView Widget Component
 * Uses Electron's <webview> tag for embedding restricted websites
 * Bypasses CORS/Frame-Busting restrictions by running in Electron context
 */

'use client';

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Globe2, AlertCircle } from 'lucide-react';
import { useWidgetHandlers } from './useWidgetHandlers';

interface WebViewWidgetProps extends WidgetProps {
  url?: string;
  allowFullScreen?: boolean;
  preloadScript?: string;
}

function WebViewWidget(props: WebViewWidgetProps) {
  const { data } = props;
  const node = data.node;
  const webviewRef = useRef<HTMLWebViewElement>(null);
  const { handleClose, handleResize, handleTitleChange } = useWidgetHandlers(node.id);
  
  // Extract webview config from node content
  const webviewConfig = typeof node.content === 'object' && node.content?.type === 'webview-widget'
    ? {
        url: node.content.url || '',
        allowFullScreen: node.content.allowFullScreen ?? true,
        preloadScript: node.content.preloadScript,
      }
    : {
        url: '',
        allowFullScreen: true,
        preloadScript: undefined,
      };

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if we're in Electron environment
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

  useEffect(() => {
    if (!isElectron && webviewConfig.url) {
      // Fallback to iframe if not in Electron
      console.warn('WebView widget requires Electron environment, falling back to iframe');
    }
  }, [isElectron, webviewConfig.url]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Setup webview event listeners (Electron webview uses DOM events, not React props)
  useEffect(() => {
    if (!isElectron || !webviewRef.current || !webviewConfig.url) return;

    const webview = webviewRef.current;
    
    const handleDidFinishLoad = () => {
      handleLoad();
    };
    
    const handleDidFailLoad = () => {
      handleError();
    };

    // Use addEventListener for Electron webview events
    webview.addEventListener('did-finish-load', handleDidFinishLoad);
    webview.addEventListener('did-fail-load', handleDidFailLoad);

    return () => {
      webview.removeEventListener('did-finish-load', handleDidFinishLoad);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
    };
  }, [isElectron, webviewConfig.url, handleLoad, handleError]);

  // If not in Electron, fallback to iframe
  if (!isElectron) {
    return (
      <BaseWidget
        {...props}
        title={node.title || 'Web App'}
        icon={<Globe2 className="w-4 h-4" />}
        className="webview-widget"
        onClose={handleClose}
        onResize={handleResize}
      >
        {!webviewConfig.url ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Globe2 className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              No URL configured
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Click to configure this widget
            </p>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            <iframe
              src={webviewConfig.url || undefined}
              className="w-full h-full border-0"
              allowFullScreen={webviewConfig.allowFullScreen}
              onLoad={handleLoad}
              onError={handleError}
              title={node.title || 'Embedded content'}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          </div>
        )}
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      {...props}
      title={node.title || 'Web App'}
      icon={<Globe2 className="w-4 h-4" />}
      className="webview-widget"
      onClose={handleClose}
      onResize={handleResize}
      onTitleChange={handleTitleChange}
    >
      {hasError ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Failed to load content
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {webviewConfig.url}
          </p>
        </div>
      ) : !webviewConfig.url ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Globe2 className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            No URL configured
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Click to configure this widget
          </p>
        </div>
      ) : (
        <div className="relative w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          {/* Electron webview tag - only works in Electron environment */}
          <webview
            ref={webviewRef}
            src={webviewConfig.url || undefined}
            className="w-full h-full"
            allowpopups={webviewConfig.allowFullScreen ? 'true' : 'false'}
            preload={webviewConfig.preloadScript}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        </div>
      )}
    </BaseWidget>
  );
}

export default memo(WebViewWidget);

