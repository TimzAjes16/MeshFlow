/**
 * Iframe Widget Component
 * Embeds web applications using HTML <iframe>
 * Supports: Discord, YouTube, Twitch, and other embeddable web services
 */

'use client';

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Globe, AlertCircle } from 'lucide-react';
import { useWidgetHandlers } from './useWidgetHandlers';

interface IframeWidgetProps extends WidgetProps {
  // Iframe-specific props
  url?: string;
  allowFullScreen?: boolean;
  sandbox?: string;
}

function IframeWidget(props: IframeWidgetProps) {
  const { data } = props;
  const node = data.node;
  const { handleClose, handleResize, handleTitleChange } = useWidgetHandlers(node.id);
  
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
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reload iframe when URL changes
  useEffect(() => {
    const currentUrl = iframeConfig.url || '';
    if (currentUrl && currentUrl !== previousUrlRef.current && iframeRef.current) {
      previousUrlRef.current = currentUrl;
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Force iframe reload by setting src to empty and then back to URL
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentUrl;
        }
      }, 10);
      
      // Set a timeout to detect if the iframe fails to load (e.g., X-Frame-Options)
      loadTimeoutRef.current = setTimeout(() => {
        if (isLoading) {
          // Check if iframe content is accessible
          try {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentWindow) {
              // Try to access iframe content - if blocked, this will throw
              iframe.contentWindow.location.href;
            }
          } catch (e: any) {
            // Iframe is blocked (X-Frame-Options or CSP)
            setIsLoading(false);
            setHasError(true);
            setErrorMessage('This website cannot be embedded in an iframe due to security restrictions (X-Frame-Options). Try using the WebView widget instead, which can bypass some restrictions.');
          }
        }
      }, 3000); // 3 second timeout
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [iframeConfig.url, isLoading]);

  const handleLoad = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
  }, []);

  const handleError = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
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
      onResize={handleResize}
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

