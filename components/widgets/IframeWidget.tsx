/**
 * Iframe Widget Component - Rebuilt from scratch
 * Simple, working iframe widget based on WebViewWidget pattern
 */

'use client';

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Globe, AlertCircle } from 'lucide-react';
import { useWidgetHandlers } from './useWidgetHandlers';

function IframeWidget(props: WidgetProps) {
  const { data } = props;
  const node = data.node;
  const { handleClose, handleTitleChange } = useWidgetHandlers(node.id);
  
  // Extract iframe config from node content
  const iframeConfig = typeof node.content === 'object' && node.content?.type === 'iframe-widget'
    ? {
        url: node.content.url || '',
        allowFullScreen: node.content.allowFullScreen ?? true,
        sandbox: node.content.sandbox || 'allow-same-origin allow-scripts allow-popups allow-forms',
      }
    : {
        url: '',
        allowFullScreen: true,
        sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
      };

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previousUrlRef = useRef<string>('');

  // Listen for URL updates
  useEffect(() => {
    const handleUrlUpdate = (event: CustomEvent) => {
      if (event.detail?.nodeId === node.id && event.detail?.widgetType === 'iframe-widget') {
        const newUrl = event.detail.url;
        if (newUrl && iframeRef.current) {
          previousUrlRef.current = newUrl;
          setIsLoading(true);
          setHasError(false);
          iframeRef.current.src = newUrl;
        }
      }
    };

    window.addEventListener('widget-url-updated', handleUrlUpdate as EventListener);
    return () => {
      window.removeEventListener('widget-url-updated', handleUrlUpdate as EventListener);
    };
  }, [node.id]);

  // Update iframe when URL changes
  useEffect(() => {
    const currentUrl = iframeConfig.url || '';
    if (currentUrl && currentUrl !== previousUrlRef.current && iframeRef.current) {
      previousUrlRef.current = currentUrl;
      setIsLoading(true);
      setHasError(false);
      iframeRef.current.src = currentUrl;
    }
  }, [iframeConfig.url]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage('Failed to load the website. It may be blocked by security restrictions (X-Frame-Options). Try using the WebView widget instead.');
  }, []);

  return (
    <BaseWidget
      {...props}
      title={node.title || 'Web App'}
      icon={<Globe className="w-4 h-4" />}
      className="iframe-widget"
      onClose={handleClose}
      onTitleChange={handleTitleChange}
    >
      {hasError ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Cannot Load Website
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 max-w-sm">
            {errorMessage || 'This website cannot be embedded in an iframe due to security restrictions.'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
            URL: {iframeConfig.url}
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">
            💡 Tip: Use the <strong>WebView Widget</strong> instead, which can bypass some restrictions in Electron.
          </div>
        </div>
      ) : !iframeConfig.url ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Globe className="w-8 h-8 text-gray-400 mb-2" />
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
            ref={iframeRef}
            src={iframeConfig.url || undefined}
            className="w-full h-full border-0"
            allowFullScreen={iframeConfig.allowFullScreen}
            sandbox={iframeConfig.sandbox}
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

export default memo(IframeWidget);
