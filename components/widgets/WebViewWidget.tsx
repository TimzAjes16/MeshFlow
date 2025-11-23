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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const previousUrlRef = useRef<string>('');
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for immediate URL update events
  useEffect(() => {
    const handleUrlUpdate = (event: CustomEvent) => {
      if (event.detail?.nodeId === node.id && event.detail?.widgetType === 'webview-widget') {
        const newUrl = event.detail.url;
        if (newUrl && webviewRef.current && isElectron) {
          // Force immediate reload
          previousUrlRef.current = newUrl;
          setIsLoading(true);
          setHasError(false);
          setErrorMessage('');
          
          // Clear any existing timeout
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
          
          const webview = webviewRef.current;
          
          // Immediately set the src
          if (webview.src !== newUrl) {
            webview.src = newUrl;
          } else {
            webview.reload();
          }
          
          // Set timeout for error detection
          loadTimeoutRef.current = setTimeout(() => {
            setIsLoading((prevLoading) => {
              if (prevLoading) {
                setHasError(true);
                setErrorMessage('Website took too long to load. It may be blocked or unreachable.');
                return false;
              }
              return prevLoading;
            });
          }, 10000);
        }
      }
    };

    window.addEventListener('widget-url-updated', handleUrlUpdate as EventListener);
    return () => {
      window.removeEventListener('widget-url-updated', handleUrlUpdate as EventListener);
    };
  }, [node.id, isElectron]);

  // Check if we're in Electron environment
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

  const handleLoad = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
  }, []);

  const handleError = useCallback((event?: any) => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
    setHasError(true);
    const errorMsg = event?.errorDescription || event?.errorCode 
      ? `Failed to load: ${event.errorDescription || `Error code ${event.errorCode}`}`
      : 'Failed to load the website';
    setErrorMessage(errorMsg);
  }, []);

  // Reload webview when URL changes - immediate loading
  useEffect(() => {
    const currentUrl = webviewConfig.url || '';
    if (currentUrl && currentUrl !== previousUrlRef.current && webviewRef.current && isElectron) {
      previousUrlRef.current = currentUrl;
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      const webview = webviewRef.current;
      
      // Immediately set the src to trigger reload - no delay
      if (webview.src !== currentUrl) {
        webview.src = currentUrl;
      } else {
        // If src is already set, reload it immediately
        webview.reload();
      }
      
      // Set a timeout to detect if the webview fails to load
      loadTimeoutRef.current = setTimeout(() => {
        // Check if still loading after timeout
        setIsLoading((prevLoading) => {
          if (prevLoading) {
            setHasError(true);
            setErrorMessage('Website took too long to load. It may be blocked or unreachable.');
            return false;
          }
          return prevLoading;
        });
      }, 10000); // 10 second timeout
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [webviewConfig.url, isElectron]);

  // Setup webview event listeners (Electron webview uses DOM events, not React props)
  useEffect(() => {
    if (!isElectron || !webviewRef.current) return;

    const webview = webviewRef.current;
    
    const handleDidFinishLoad = () => {
      handleLoad();
    };
    
    const handleDidFailLoad = (event: any) => {
      handleError(event);
    };
    
    const handleDidStartLoading = () => {
      setIsLoading(true);
      setHasError(false);
    };

    // Use addEventListener for Electron webview events
    webview.addEventListener('did-finish-load', handleDidFinishLoad);
    webview.addEventListener('did-fail-load', handleDidFailLoad);
    webview.addEventListener('did-start-loading', handleDidStartLoading);

    return () => {
      webview.removeEventListener('did-finish-load', handleDidFinishLoad);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
    };
  }, [isElectron, handleLoad, handleError]);

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
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Failed to Load Website
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 max-w-sm">
            {errorMessage || 'Failed to load the website. Please check the URL and try again.'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            URL: {webviewConfig.url}
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
            allowpopups="true"
            webpreferences="allowRunningInsecureContent, javascript=yes"
            style={{ 
              display: isLoading || hasError ? 'none' : 'block',
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      )}
    </BaseWidget>
  );
}

export default memo(WebViewWidget);

