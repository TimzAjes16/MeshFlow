'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import CanvasContainer from './CanvasContainer';
import VerticalToolbar from './VerticalToolbar';
import HorizontalEditorBar from './HorizontalEditorBar';
import DrawingCanvas from './DrawingCanvas';
import KeyboardShortcuts from './KeyboardShortcuts';
import ToolbarSettingsPanel from './ToolbarSettingsPanel';
import EmojiPickerPopup from './EmojiPickerPopup';
import CaptureModal from './CaptureModal';
import ClipboardMonitor from './ClipboardMonitor';
import NativeWindowConfigModal from './NativeWindowConfigModal';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { useHistoryStore } from '@/state/historyStore';
import { getDefaultNodeContent, getDefaultNodeTitle } from '@/lib/nodeDefaults';
import type { Node } from '@/types/Node';

interface CanvasPageClientProps {
  workspaceId: string;
}

export default function CanvasPageClient({ workspaceId }: CanvasPageClientProps) {
  const { nodes, addNode, updateNode } = useWorkspaceStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const [isCreating, setIsCreating] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerNode, setEmojiPickerNode] = useState<Node | null>(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [captureModalOpen, setCaptureModalOpen] = useState(false);
  const [captureNodeId, setCaptureNodeId] = useState<string | null>(null); // For updating existing nodes
  const [activeCaptureNodes, setActiveCaptureNodes] = useState<Set<string>>(new Set()); // Nodes with auto-refresh enabled
  const [nativeWindowConfigOpen, setNativeWindowConfigOpen] = useState(false);
  const [pendingNativeWindowType, setPendingNativeWindowType] = useState<{ type: string; position?: { x: number; y: number } } | null>(null);
  
  // Use a ref to track if we're currently creating a node to prevent duplicates
  const isCreatingLiveCaptureRef = useRef(false);

  // Clear selectedNodeType when node is deselected
  useEffect(() => {
    if (!selectedNodeId) {
      setSelectedNodeType(null);
      setToolbarPosition(null); // Also clear toolbar position when deselected
    }
  }, [selectedNodeId]);

  // Handle live-capture node creation
  const handleCaptureComplete = useCallback(
    async (imageUrl: string, cropArea: { x: number; y: number; width: number; height: number }) => {
      if (captureNodeId) {
        // Update existing capture node
        const node = nodes.find(n => n.id === captureNodeId);
        if (node) {
          const currentContent = typeof node.content === 'object' && node.content?.type === 'live-capture'
            ? node.content
            : { type: 'live-capture', imageUrl: '', cropArea: { x: 0, y: 0, width: 0, height: 0 }, captureHistory: [] };
          
          const captureHistory = currentContent.captureHistory || [];
          const newCapture = {
            imageUrl,
            timestamp: new Date().toISOString(),
          };
          
          updateNode(captureNodeId, {
            content: {
              ...currentContent,
              type: 'live-capture',
              imageUrl,
              cropArea,
              screenBounds: cropArea, // Store screen bounds for interactive mode
              captureHistory: [...captureHistory, newCapture],
              timestamp: new Date().toISOString(),
              isLiveStream: true, // Always use live stream mode
              interactive: false, // Default to non-interactive
            },
          });
          
          // Persist to API
          try {
            const response = await fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: captureNodeId,
                content: {
                  ...currentContent,
                  type: 'live-capture',
                  imageUrl,
                  cropArea,
                  captureHistory: [...captureHistory, newCapture],
                  timestamp: new Date().toISOString(),
                },
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.node) {
                updateNode(captureNodeId, data.node);
              }
            }
          } catch (error) {
            console.error('Error updating capture node:', error);
          }
        }
        setCaptureNodeId(null);
      } else {
        // Create new capture node
        const storedFlowPos = (window as any).lastFlowPosition || { x: 500, y: 400 };
        
        try {
          const response = await fetch('/api/nodes/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              title: 'Live Capture',
              type: 'live-capture',
              content: {
                type: 'live-capture',
                imageUrl,
                cropArea,
                screenBounds: cropArea, // Store screen bounds for interactive mode
                captureHistory: [{
                  imageUrl,
                  timestamp: new Date().toISOString(),
                }],
                timestamp: new Date().toISOString(),
                isLiveStream: true, // Always use live stream mode
                interactive: false, // Default to non-interactive
              },
              tags: ['live-capture'],
              x: storedFlowPos.x,
              y: storedFlowPos.y,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.node) {
              addNode(data.node);
              selectNode(data.node.id);
              (window as any).lastFlowPosition = null;
            }
          }
        } catch (error) {
          console.error('Error creating capture node:', error);
          alert('Failed to create capture node');
        }
      }
    },
    [captureNodeId, nodes, workspaceId, updateNode, addNode, selectNode]
  );

  // Listen for capture node updates
  useEffect(() => {
    const handleUpdateCaptureNode = (event: CustomEvent) => {
      const nodeId = event.detail.nodeId;
      // Access nodes from store directly to avoid dependency issues
      const currentNodes = useWorkspaceStore.getState().nodes;
      const node = currentNodes.find(n => n.id === nodeId);
      const isLiveCaptureNode = node && typeof node.content === 'object' && node.content?.type === 'live-capture';
      
      // For live capture nodes, show capture modal
      if (isLiveCaptureNode) {
        setCaptureNodeId(nodeId);
        setCaptureModalOpen(true);
      } else {
        // For regular capture, show upload/paste modal
        setCaptureNodeId(nodeId);
        setCaptureModalOpen(true);
      }
    };
    
    // Removed handleStartScreenCaptureForNode and handleStartScreenCapture - now using CaptureModal instead
    
    // Handle open live capture modal from toolbar
    const handleOpenLiveCaptureModal = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      if (nodeId) {
        // Update existing node
        setCaptureNodeId(nodeId);
      } else {
        // Create new node
        setCaptureNodeId(null);
      }
      setCaptureModalOpen(true);
    };

    // Handle recrop live capture node
    const handleRecropLiveCapture = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      // Access nodes from store directly to avoid dependency issues
      const currentNodes = useWorkspaceStore.getState().nodes;
      const node = currentNodes.find(n => n.id === nodeId);
      if (node && typeof node.content === 'object' && node.content?.type === 'live-capture') {
        // Open capture modal in recrop mode
        setCaptureNodeId(nodeId);
        (window as any).liveCaptureMode = 'recrop';
        setCaptureModalOpen(true);
      }
    };
    
    // Handle create live capture from floating crop area
    const handleCreateLiveCaptureFromArea = async (event: CustomEvent) => {
      console.log('[CanvasPageClient] handleCreateLiveCaptureFromArea called with:', event.detail);
      const { area, stream } = event.detail;
      
      // Prevent duplicate creation - if already creating, ignore this event
      if (isCreatingLiveCaptureRef.current) {
        console.warn('[CanvasPageClient] Already creating live capture node, ignoring duplicate event');
        return;
      }
      
      if (!stream || !area) {
        console.error('[CanvasPageClient] Missing stream or area for live capture:', { stream: !!stream, area: !!area });
        return;
      }

      // Set flag to prevent duplicate creation
      isCreatingLiveCaptureRef.current = true;
      console.log('[CanvasPageClient] Creating live capture node with area:', area, 'and stream:', stream.id);

      try {
        // Get thumbnail from stream
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        
        await new Promise((resolve) => {
          video.addEventListener('loadedmetadata', resolve, { once: true });
          setTimeout(resolve, 1000); // Timeout after 1 second
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = area.width;
        canvas.height = area.height;
        
        // Wait for video to be ready
        if (video.readyState < 2) {
          await new Promise((resolve) => {
            video.addEventListener('loadeddata', resolve, { once: true });
            setTimeout(resolve, 2000);
          });
        }
        
        // Get video dimensions for proper coordinate conversion
        // The video stream captures what the user selected (screen/window)
        // We need to determine the actual video dimensions to properly crop
        const videoWidth = video.videoWidth || window.screen.width;
        const videoHeight = video.videoHeight || window.screen.height;
        
        console.log('[CanvasPageClient] Video dimensions:', {
          videoWidth,
          videoHeight,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          cropArea: area
        });
        
        // The cropArea is in absolute screen coordinates
        // The video stream represents the entire screen/window that was selected
        // We need to determine if the video is:
        // 1. The full primary screen (videoWidth = screen.width)
        // 2. A specific window (videoWidth < screen.width)
        // 3. A secondary monitor (different dimensions)
        
        // For now, assume the video represents the screen that contains the crop area
        // Calculate which screen the area is on by checking screen bounds
        // In a multi-monitor setup, we'd need to determine which monitor contains the area
        // For simplicity, if video matches screen dimensions, assume it's the primary screen
        const isFullScreen = (videoWidth === window.screen.width && videoHeight === window.screen.height);
        
        // Store screen bounds for coordinate conversion in LiveCaptureNode
        // screenBounds should represent the screen area that the video stream covers
        // If it's full screen, use screen dimensions
        // Otherwise, assume the video is positioned at (0,0) of the selected screen/window
        const screenBounds = isFullScreen ? {
          x: 0,
          y: 0,
          width: window.screen.width,
          height: window.screen.height
        } : {
          x: 0,
          y: 0,
          width: videoWidth,  // Use actual video dimensions for window/app captures
          height: videoHeight
        };
        
        // Convert cropArea from absolute screen coordinates to video coordinates
        // If the video is full screen, cropArea is already in screen coordinates
        // If the video is a window/app, we need to adjust coordinates
        let cropX, cropY, cropW, cropH;
        
        if (isFullScreen) {
          // Full screen capture - use cropArea directly
          cropX = Math.max(0, Math.min(area.x, videoWidth));
          cropY = Math.max(0, Math.min(area.y, videoHeight));
          cropW = Math.min(area.width, videoWidth - cropX);
          cropH = Math.min(area.height, videoHeight - cropY);
        } else {
          // Window/app capture - assume the video starts at the window's position
          // The cropArea is in screen coordinates, but the video starts at (0,0)
          // So we need to check if the cropArea is within the video bounds
          // For now, assume the selected window contains the crop area
          // This is a simplification - in practice, the user should select the window that contains the area
          cropX = Math.max(0, Math.min(area.x, videoWidth));
          cropY = Math.max(0, Math.min(area.y, videoHeight));
          cropW = Math.min(area.width, videoWidth - cropX);
          cropH = Math.min(area.height, videoHeight - cropY);
        }
        
        // Draw cropped region (for thumbnail) - only draw what's in the selected area
        ctx.drawImage(
          video,
          cropX, cropY, cropW, cropH,
          0, 0, area.width, area.height
        );
        
        const imageUrl = canvas.toDataURL('image/png');
        
        // Create new live capture node
        const storedFlowPos = (window as any).lastFlowPosition || { x: 500, y: 400 };
        
        console.log('[CanvasPageClient] Storing screen bounds:', screenBounds);
        
        const response = await fetch('/api/nodes/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            title: 'Live Capture',
            type: 'live-capture',
            content: {
              type: 'live-capture',
              imageUrl, // Thumbnail
              cropArea: area, // The selected area in screen coordinates
              screenBounds: screenBounds, // Store full screen bounds for coordinate conversion
              streamId: stream.id,
              isLiveStream: true,
              captureMode: 'custom',
              interactive: false,
              captureHistory: imageUrl ? [{
                imageUrl,
                timestamp: new Date().toISOString(),
              }] : [],
              timestamp: new Date().toISOString(),
            },
            tags: ['live-capture'],
            x: storedFlowPos.x,
            y: storedFlowPos.y,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[CanvasPageClient] Node created successfully:', data.node?.id);
          if (data.node) {
            // Verify stream is still active before storing
            const tracks = stream.getVideoTracks();
            console.log('[CanvasPageClient] Stream tracks:', tracks.length, 'ready states:', tracks.map(t => t.readyState));
            if (tracks.length > 0 && tracks.some(t => t.readyState === 'live' || t.readyState === 'ended')) {
              // Store stream in global registry
              if (!(window as any).liveCaptureStreams) {
                (window as any).liveCaptureStreams = new Map();
              }
              
              // Store screen bounds for coordinate conversion
              // Use the same screenBounds that were stored in the node
              // These represent the actual video stream dimensions
              (window as any).liveCaptureStreams.set(data.node.id, {
                stream,
                cropArea: area,
                screenBounds: screenBounds, // Use the screenBounds calculated above
              });
              
              console.log('[CanvasPageClient] Stream stored in registry for node:', data.node.id);
              
              // Dispatch event to notify LiveCaptureNode
              window.dispatchEvent(new CustomEvent('live-capture-stream-ready', {
                detail: { nodeId: data.node.id }
              }));
              
              console.log('[CanvasPageClient] live-capture-stream-ready event dispatched');
              
              // Add node to workspace
              addNode(data.node);
              selectNode(data.node.id);
              
              console.log('[CanvasPageClient] Node added to workspace and selected');
              
              (window as any).lastFlowPosition = null;
            } else {
              console.warn('[CanvasPageClient] Stream tracks not in valid state:', tracks.map(t => ({ state: t.readyState, enabled: t.enabled })));
            }
          } else {
            console.error('[CanvasPageClient] No node in response:', data);
          }
        } else {
          console.error('[CanvasPageClient] Failed to create node, response status:', response.status);
          const errorText = await response.text();
          console.error('[CanvasPageClient] Error response:', errorText);
        }
      } catch (error) {
        console.error('Error creating live capture from area:', error);
        alert('Failed to create live capture. Please try again.');
      } finally {
        // Reset flag after creation completes (success or failure)
        isCreatingLiveCaptureRef.current = false;
      }
    };

    window.addEventListener('update-capture-node', handleUpdateCaptureNode as EventListener);
    window.addEventListener('open-live-capture-modal', handleOpenLiveCaptureModal as EventListener);
    window.addEventListener('recrop-live-capture', handleRecropLiveCapture as EventListener);
    window.addEventListener('create-live-capture-from-area', handleCreateLiveCaptureFromArea as EventListener);
    
    return () => {
      window.removeEventListener('update-capture-node', handleUpdateCaptureNode as EventListener);
      window.removeEventListener('open-live-capture-modal', handleOpenLiveCaptureModal as EventListener);
      window.removeEventListener('recrop-live-capture', handleRecropLiveCapture as EventListener);
      window.removeEventListener('create-live-capture-from-area', handleCreateLiveCaptureFromArea as EventListener);
    };
  }, []); // No dependencies needed - handlers access store directly

  // Handle clipboard image detection for live capture nodes
  const handleClipboardImage = useCallback(
    async (imageUrl: string) => {
      // Find all active live capture nodes
      const liveCaptureNodes = nodes.filter((node) => {
        const content = typeof node.content === 'object' && node.content?.type === 'live-capture'
          ? node.content
          : null;
        return content && (content.autoRefresh ?? true) && activeCaptureNodes.has(node.id);
      });

      for (const node of liveCaptureNodes) {
        const currentContent = typeof node.content === 'object' && node.content?.type === 'live-capture'
          ? node.content
          : { type: 'live-capture', imageUrl: '', cropArea: { x: 0, y: 0, width: 0, height: 0 }, captureHistory: [] };
        
        const captureHistory = currentContent.captureHistory || [];
        
        // If we have a crop area, apply it to the new image
        if (currentContent.cropArea && currentContent.cropArea.width > 0 && currentContent.cropArea.height > 0) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              
              canvas.width = currentContent.cropArea.width;
              canvas.height = currentContent.cropArea.height;
              
              ctx.drawImage(
                img,
                currentContent.cropArea.x, currentContent.cropArea.y,
                currentContent.cropArea.width, currentContent.cropArea.height,
                0, 0, currentContent.cropArea.width, currentContent.cropArea.height
              );
              
              const croppedImageUrl = canvas.toDataURL('image/png');
              
              // Add new capture to history
              const newCapture = {
                imageUrl: croppedImageUrl,
                timestamp: new Date().toISOString(),
              };
              
              updateNode(node.id, {
                content: {
                  ...currentContent,
                  type: 'live-capture',
                  imageUrl: croppedImageUrl,
                  captureHistory: [...captureHistory, newCapture],
                  timestamp: new Date().toISOString(),
                },
              });
              
              // Persist to API
              fetch('/api/nodes/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nodeId: node.id,
                  content: {
                    ...currentContent,
                    type: 'live-capture',
                    imageUrl: croppedImageUrl,
                    captureHistory: [...captureHistory, newCapture],
                    timestamp: new Date().toISOString(),
                  },
                }),
              }).then((response) => {
                if (response.ok) {
                  return response.json();
                }
              }).then((data) => {
                if (data?.node) {
                  updateNode(node.id, data.node);
                }
              }).catch((error) => {
                console.error('Error updating capture node from clipboard:', error);
              });
            };
            img.src = imageUrl;
          } catch (error) {
            console.error('Error cropping clipboard image:', error);
          }
        } else {
          // No crop area, use image as-is
          const newCapture = {
            imageUrl,
            timestamp: new Date().toISOString(),
          };
          
          updateNode(node.id, {
            content: {
              ...currentContent,
              type: 'live-capture',
              imageUrl,
              captureHistory: [...captureHistory, newCapture],
              timestamp: new Date().toISOString(),
            },
          });
          
          // Persist to API
          fetch('/api/nodes/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId: node.id,
              content: {
                ...currentContent,
                type: 'live-capture',
                imageUrl,
                captureHistory: [...captureHistory, newCapture],
                timestamp: new Date().toISOString(),
              },
            }),
          }).then((response) => {
            if (response.ok) {
              return response.json();
            }
          }).then((data) => {
            if (data?.node) {
              updateNode(node.id, data.node);
            }
          }).catch((error) => {
            console.error('Error updating capture node from clipboard:', error);
          });
        }
      }
    },
    [nodes, activeCaptureNodes, updateNode]
  );

  // Removed handleScreenCapture, handleScreenAreaSelected, and handleScreenCaptureCancel - no longer needed

  // Update active capture nodes when nodes change
  useEffect(() => {
    const liveCaptureNodes = nodes.filter((node) => {
      const content = typeof node.content === 'object' && node.content?.type === 'live-capture'
        ? node.content
        : null;
      return content && (content.autoRefresh ?? true);
    });
    
    setActiveCaptureNodes(new Set(liveCaptureNodes.map((n) => n.id)));
  }, [nodes]);

  const handleCreateNode = useCallback(
    async (type: string = 'note', screenPosition: { x: number; y: number }, extraConfig?: Record<string, any>) => {
      console.log('handleCreateNode called with type:', type, 'position:', screenPosition);
      
      // Handle live-capture type specially - show modal
      if (type === 'live-capture') {
        setCaptureNodeId(null); // New capture
        setCaptureModalOpen(true);
        return;
      }
      
      if (isCreating) {
        console.log('Already creating node, skipping');
        return;
      }
      
      setIsCreating(true);
      setToolbarPosition(null); // Hide toolbar
      // Don't set selectedNodeType here - wait until node is successfully created
      // This prevents the settings panel from showing if the API call fails

      try {
        const titles: Record<string, string> = {
          text: 'Text Block',
          note: 'New Note',
          link: 'New Link',
          image: 'New Image',
          emoji: '😀',
          box: 'New Box',
          circle: 'New Circle',
          arrow: 'Arrow',
          'bar-chart': 'Bar Chart',
          'line-chart': 'Line Chart',
          'pie-chart': 'Pie Chart',
          'area-chart': 'Area Chart',
        };

        // Get default content based on node type
        const getDefaultContent = (type: string, extraConfig?: Record<string, any>) => {
          // Widget types
          if (type === 'iframe-widget') {
            return {
              type: 'iframe-widget',
              url: '',
              allowFullScreen: true,
              sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
            };
          }
          if (type === 'webview-widget') {
            return {
              type: 'webview-widget',
              url: '',
              allowFullScreen: true,
            };
          }
          if (type === 'live-capture-widget') {
            return {
              type: 'live-capture-widget',
              imageUrl: '',
              cropArea: { x: 0, y: 0, width: 0, height: 0 },
              sourceUrl: '',
              captureHistory: [],
              isLiveStream: true,
              interactive: false,
            };
          }
          if (type === 'native-window-widget') {
            return {
              type: 'native-window-widget',
              processName: '',
              windowTitle: '',
              windowHandle: undefined,
            };
          }
          
          // Chart types
          if (type === 'bar-chart' || type === 'line-chart' || type === 'area-chart') {
            return {
              chart: {
                data: [
                  { name: 'Jan', value: 400 },
                  { name: 'Feb', value: 300 },
                  { name: 'Mar', value: 500 },
                  { name: 'Apr', value: 278 },
                  { name: 'May', value: 189 },
                ],
                xKey: 'name',
                yKey: 'value',
                color: '#3b82f6',
                showGrid: true,
                showLegend: false,
              },
            };
          } else if (type === 'pie-chart') {
            return {
              chart: {
                data: [
                  { name: 'Category A', value: 400 },
                  { name: 'Category B', value: 300 },
                  { name: 'Category C', value: 300 },
                  { name: 'Category D', value: 200 },
                ],
                showLegend: true,
              },
            };
          }
          return {};
        };

        // Get flow position from CanvasContainer (stored globally)
        const storedFlowPos = (window as any).lastFlowPosition || { x: 500, y: 400 };

        // Create node in database
        const response = await fetch('/api/nodes/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            title: titles[type] || 'New Widget',
            type: type, // Explicit type (following Miro/Notion pattern)
            content: getDefaultContent(type, extraConfig),
            tags: [type], // Keep for backwards compatibility
            x: storedFlowPos.x,
            y: storedFlowPos.y,
          }),
        });

        const data = await response.json();
        
        console.log('[CanvasPageClient] Node creation response:', {
          ok: response.ok,
          status: response.status,
          data: data,
        });

        if (!response.ok) {
          console.error('[CanvasPageClient] Error creating node:', {
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            errorType: data.errorType,
            errorCode: data.errorCode,
            details: data.details,
          });
          
          // Show detailed error message
          const errorMessage = data.error || `Server error (${response.status})`;
          const errorDetails = data.details ? `\n\nDetails: ${data.details}` : '';
          alert(`Failed to create node: ${errorMessage}${errorDetails}`);
          
          // Reset UI state on error
          setSelectedNodeType(null);
          setIsCreating(false);
          setToolbarPosition(null);
          return;
        }

        if (data.node) {
          console.log('[CanvasPageClient] Node created successfully:', data.node);
          console.log('[CanvasPageClient] Node position:', { x: data.node.x, y: data.node.y });
          
          // Add node to store immediately for instant UI update
          // This will trigger CanvasContainer's sync effect to update React Flow
          addNode(data.node);
          
          // Clear stored flow position since we've used it
          (window as any).lastFlowPosition = null;
          (window as any).lastScreenPosition = null;
          
          // NOW show settings panel after successful node creation
          // This ensures it doesn't show if API call fails
          setSelectedNodeType(type);
          
          // Trigger workspace refresh to sync with backend (updates ListView and ClustersView)
          // Use a small delay to ensure immediate store update happens first
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          }, 100);
          
          // Select the new node so it appears selected on canvas and in minimap
          // The settings panel will automatically switch from ToolbarSettingsPanel to NodeEditorPanel
          // when selectedNodeId is set, so we don't need to clear selectedNodeType here
          setTimeout(() => {
            selectNode(data.node.id);
            
            // Keep settings panel visible - it will switch to NodeEditorPanel automatically
            // when selectedNodeId is set (see the conditional rendering in the return statement)
          
          
            // Focus title field after a brief delay to ensure editor is rendered
          setTimeout(() => {
            const titleInput = document.querySelector('input[placeholder="Node title..."]') as HTMLInputElement;
            if (titleInput) {
              titleInput.focus();
              titleInput.select();
            }
          }, 100);
          }, 150); // Small delay to ensure node is in React Flow state
        }
      } catch (error: any) {
        console.error('[CanvasPageClient] Error creating node (catch block):', {
          error,
          message: error?.message,
          stack: error?.stack,
        });
        
        // Reset UI state on error
        setSelectedNodeType(null);
        setToolbarPosition(null);
        
        // Show error to user
        alert(`Failed to create node: ${error?.message || 'Network error. Please check your connection and try again.'}`);
      } finally {
        setIsCreating(false);
      }
    },
    [workspaceId, isCreating, addNode, selectNode]
  );

  const handleDuplicateNode = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      const response = await fetch('/api/nodes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          title: `${node.title} (Copy)`,
          content: node.content,
          tags: node.tags,
          x: node.x + 50,
          y: node.y + 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          addNode(data.node);
          selectNode(data.node.id);
          window.dispatchEvent(new CustomEvent('refreshWorkspace'));
        }
      }
    } catch (error) {
      console.error('Error duplicating node:', error);
    }
  }, [workspaceId, nodes, addNode, selectNode]);

  // Handle native window configuration confirmation
  const handleNativeWindowConfigConfirm = useCallback(async (config: { processName: string; windowTitle: string }) => {
    if (!pendingNativeWindowType) return;
    
    const { type, position } = pendingNativeWindowType;
    const reactFlowInstance = (window as any).reactFlowInstance;
    const flowPosition = reactFlowInstance?.screenToFlowPosition?.(position || { x: window.innerWidth / 2, y: window.innerHeight / 2 }) || position || { x: 500, y: 400 };
    
    // Create node with configuration
    await handleCreateNode(type, flowPosition, config);
    
    setPendingNativeWindowType(null);
    setNativeWindowConfigOpen(false);
  }, [pendingNativeWindowType, handleCreateNode]);

  // Listen for widget creation events (must be after handleCreateNode is defined)
  useEffect(() => {
    const handleCreateWidget = async (event: CustomEvent) => {
      const { type } = event.detail;
      const position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      
      // For native window widget, show configuration modal first
      if (type === 'native-window-widget') {
        setPendingNativeWindowType({ type, position });
        setNativeWindowConfigOpen(true);
        return;
      }
      
      // Try to get reactFlowInstance from window or use position directly
      const reactFlowInstance = (window as any).reactFlowInstance;
      const flowPosition = reactFlowInstance?.screenToFlowPosition?.(position) || position;
      
      await handleCreateNode(type, flowPosition);
    };

    window.addEventListener('create-widget', handleCreateWidget as EventListener);
    
    return () => {
      window.removeEventListener('create-widget', handleCreateWidget as EventListener);
    };
  }, [handleCreateNode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work even when typing
        if (e.key === 'Escape') {
          target.blur();
          selectNode(null);
          setToolbarPosition(null);
        }
        // Allow Ctrl/Cmd+N when typing (node creation handled elsewhere)
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
          e.preventDefault();
          // Node creation will be handled by toolbar
        }
        return;
      }

      // Undo/Redo shortcuts: Ctrl+Z and Ctrl+Shift+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          const entry = undo();
          if (entry) {
            window.dispatchEvent(new CustomEvent('history-undo', { detail: { entry } }));
          }
        }
        return;
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) {
          const entry = redo();
          if (entry) {
            window.dispatchEvent(new CustomEvent('history-redo', { detail: { entry } }));
          }
        }
        return;
      }

      // Layer controls: Ctrl+] Bring to Front, Ctrl+[ Send to Back, Ctrl+↑ Move Forward, Ctrl+↓ Move Backward
      if ((e.metaKey || e.ctrlKey) && selectedNodeId && nodes.length > 0) {
        const selectedNode = nodes.find(n => n.id === selectedNodeId);
        if (selectedNode) {
          const nodeMetadata = selectedNode.content && typeof selectedNode.content === 'object' && 'nodeMetadata' in selectedNode.content
            ? (selectedNode.content as any).nodeMetadata
            : {};
          const currentZIndex = nodeMetadata.zIndex || 0;

          if (e.key === ']') {
            e.preventDefault();
            // Bring to Front
            const sortedNodes = [...nodes].sort((a, b) => {
              const aMeta = a.content && typeof a.content === 'object' && 'nodeMetadata' in a.content
                ? (a.content as any).nodeMetadata
                : {};
              const bMeta = b.content && typeof b.content === 'object' && 'nodeMetadata' in b.content
                ? (b.content as any).nodeMetadata
                : {};
              return (aMeta.zIndex || 0) - (bMeta.zIndex || 0);
            });
            const maxZIndex = Math.max(...sortedNodes.map(n => {
              const meta = n.content && typeof n.content === 'object' && 'nodeMetadata' in n.content
                ? (n.content as any).nodeMetadata
                : {};
              return meta.zIndex || 0;
            }));
            const newContent = {
              ...selectedNode.content,
              nodeMetadata: { ...nodeMetadata, zIndex: maxZIndex + 1 },
            };
            updateNode(selectedNodeId, { content: newContent });
            fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: selectedNodeId,
                content: newContent,
              }),
            }).catch((error) => {
              console.error('Error updating layer:', error);
            });
            // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
            return;
          } else if (e.key === '[') {
            e.preventDefault();
            // Send to Back
            const sortedNodes = [...nodes].sort((a, b) => {
              const aMeta = a.content && typeof a.content === 'object' && 'nodeMetadata' in a.content
                ? (a.content as any).nodeMetadata
                : {};
              const bMeta = b.content && typeof b.content === 'object' && 'nodeMetadata' in b.content
                ? (b.content as any).nodeMetadata
                : {};
              return (aMeta.zIndex || 0) - (bMeta.zIndex || 0);
            });
            const minZIndex = Math.min(...sortedNodes.map(n => {
              const meta = n.content && typeof n.content === 'object' && 'nodeMetadata' in n.content
                ? (n.content as any).nodeMetadata
                : {};
              return meta.zIndex || 0;
            }));
            const newContent = {
              ...selectedNode.content,
              nodeMetadata: { ...nodeMetadata, zIndex: minZIndex - 1 },
            };
            updateNode(selectedNodeId, { content: newContent });
            fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: selectedNodeId,
                content: newContent,
              }),
            }).catch((error) => {
              console.error('Error updating layer:', error);
            });
            // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            // Move Forward
            const sortedNodes = [...nodes].sort((a, b) => {
              const aMeta = a.content && typeof a.content === 'object' && 'nodeMetadata' in a.content
                ? (a.content as any).nodeMetadata
                : {};
              const bMeta = b.content && typeof b.content === 'object' && 'nodeMetadata' in b.content
                ? (b.content as any).nodeMetadata
                : {};
              return (aMeta.zIndex || 0) - (bMeta.zIndex || 0);
            });
            const nextNode = sortedNodes.find(n => {
              if (n.id === selectedNodeId) return false;
              const meta = n.content && typeof n.content === 'object' && 'nodeMetadata' in n.content
                ? (n.content as any).nodeMetadata
                : {};
              return (meta.zIndex || 0) > currentZIndex;
            });
            if (nextNode) {
              const nextMeta = nextNode.content && typeof nextNode.content === 'object' && 'nodeMetadata' in nextNode.content
                ? (nextNode.content as any).nodeMetadata
                : {};
              const nextZIndex = nextMeta.zIndex || 0;
              updateNode(selectedNodeId, {
                content: {
                  ...selectedNode.content,
                  nodeMetadata: { ...nodeMetadata, zIndex: nextZIndex },
                },
              });
              updateNode(nextNode.id, {
                content: {
                  ...nextNode.content,
                  nodeMetadata: { ...nextMeta, zIndex: currentZIndex },
                },
              });
              Promise.all([
                fetch('/api/nodes/update', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nodeId: selectedNodeId,
                    content: { ...selectedNode.content, nodeMetadata: { ...nodeMetadata, zIndex: nextZIndex } },
                  }),
                }),
                fetch('/api/nodes/update', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nodeId: nextNode.id,
                    content: { ...nextNode.content, nodeMetadata: { ...nextMeta, zIndex: currentZIndex } },
                  }),
                }),
              ]).then(() => {
                window.dispatchEvent(new CustomEvent('refreshWorkspace'));
              });
            } else {
              const newContent = {
                ...selectedNode.content,
                nodeMetadata: { ...nodeMetadata, zIndex: currentZIndex + 1 },
              };
              updateNode(selectedNodeId, { content: newContent });
              fetch('/api/nodes/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nodeId: selectedNodeId,
                  content: newContent,
                }),
              }).catch((error) => {
              console.error('Error updating layer:', error);
            });
            // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
            }
            return;
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            // Move Backward
            const sortedNodes = [...nodes].sort((a, b) => {
              const aMeta = a.content && typeof a.content === 'object' && 'nodeMetadata' in a.content
                ? (a.content as any).nodeMetadata
                : {};
              const bMeta = b.content && typeof b.content === 'object' && 'nodeMetadata' in b.content
                ? (b.content as any).nodeMetadata
                : {};
              return (aMeta.zIndex || 0) - (bMeta.zIndex || 0);
            });
            const prevNode = [...sortedNodes].reverse().find(n => {
              if (n.id === selectedNodeId) return false;
              const meta = n.content && typeof n.content === 'object' && 'nodeMetadata' in n.content
                ? (n.content as any).nodeMetadata
                : {};
              return (meta.zIndex || 0) < currentZIndex;
            });
            if (prevNode) {
              const prevMeta = prevNode.content && typeof prevNode.content === 'object' && 'nodeMetadata' in prevNode.content
                ? (prevNode.content as any).nodeMetadata
                : {};
              const prevZIndex = prevMeta.zIndex || 0;
              updateNode(selectedNodeId, {
                content: {
                  ...selectedNode.content,
                  nodeMetadata: { ...nodeMetadata, zIndex: prevZIndex },
                },
              });
              updateNode(prevNode.id, {
                content: {
                  ...prevNode.content,
                  nodeMetadata: { ...prevMeta, zIndex: currentZIndex },
                },
              });
              Promise.all([
                fetch('/api/nodes/update', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nodeId: selectedNodeId,
                    content: { ...selectedNode.content, nodeMetadata: { ...nodeMetadata, zIndex: prevZIndex } },
                  }),
                }),
                fetch('/api/nodes/update', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nodeId: prevNode.id,
                    content: { ...prevNode.content, nodeMetadata: { ...prevMeta, zIndex: currentZIndex } },
                  }),
                }),
              ]).then(() => {
                window.dispatchEvent(new CustomEvent('refreshWorkspace'));
              });
            } else {
              const newContent = {
                ...selectedNode.content,
                nodeMetadata: { ...nodeMetadata, zIndex: currentZIndex - 1 },
              };
              updateNode(selectedNodeId, { content: newContent });
              fetch('/api/nodes/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nodeId: selectedNodeId,
                  content: newContent,
                }),
              }).catch((error) => {
              console.error('Error updating layer:', error);
            });
            // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
            }
            return;
          }
        }
      }

      // Ctrl/Cmd + N: Create new node (handled by toolbar)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        // Node creation will be handled by toolbar
      }

      // Delete/Backspace: Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        // Dispatch delete event
        window.dispatchEvent(new CustomEvent('deleteSelectedNode', { detail: { nodeId: selectedNodeId } }));
      }

      // Escape: Deselect node and close settings panel
      if (e.key === 'Escape') {
        selectNode(null);
        setSelectedNodeType(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNode, selectedNodeId]);

  // Listen for delete node event
  useEffect(() => {
    const handleDeleteNode = async (event: CustomEvent) => {
      const { nodeId } = event.detail;
      if (!nodeId) return;

      try {
        const response = await fetch(`/api/nodes/${nodeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove from store
          useWorkspaceStore.getState().deleteNode(nodeId);
          selectNode(null);
        }
      } catch (error) {
        console.error('Error deleting node:', error);
      }
    };

    window.addEventListener('deleteSelectedNode', handleDeleteNode as unknown as EventListener);
    return () => window.removeEventListener('deleteSelectedNode', handleDeleteNode as unknown as EventListener);
  }, [selectNode]);

  // Listen for emoji picker open event
  useEffect(() => {
    const handleOpenEmojiPicker = (event: CustomEvent) => {
      const { nodeId, position } = event.detail;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setEmojiPickerNode(node);
        // Center the popup on screen
        setEmojiPickerPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        setEmojiPickerOpen(true);
        selectNode(nodeId); // Select the node
      }
    };

    window.addEventListener('openEmojiPicker', handleOpenEmojiPicker as EventListener);
    return () => window.removeEventListener('openEmojiPicker', handleOpenEmojiPicker as EventListener);
  }, [nodes, selectNode]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback(async (emojiString: string) => {
    if (!emojiPickerNode || !workspaceId) return;

    // Parse emoji string into array (handle both single and multiple emojis)
    const emojis = Array.from(emojiString);
    
    const currentContent = emojiPickerNode.content && typeof emojiPickerNode.content === 'object'
      ? { ...emojiPickerNode.content, emoji: emojis }
      : { emoji: emojis };

    // Use first emoji as title, or combine if multiple
    const title = emojis.length > 0 ? (emojis.length === 1 ? emojis[0] : emojis.join('')) : '😀';

    // Update node optimistically
    updateNode(emojiPickerNode.id, {
      title: title,
      content: currentContent,
    });

    // Persist to API
    try {
      const response = await fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: emojiPickerNode.id,
          title: title,
          content: currentContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          updateNode(emojiPickerNode.id, data.node);
        }
      }
    } catch (error) {
      console.error('Error updating emoji:', error);
    }
  }, [emojiPickerNode, workspaceId, updateNode]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Main Canvas Area - must fill available space */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 min-w-0 min-h-0 relative">
          <CanvasContainer 
            workspaceId={workspaceId} 
            onCreateNode={(pos) => {
              // Store click position for node creation
              (window as any).lastClickPosition = pos;
            }}
          />
          
          {/* Floating Vertical Toolbar - Left side */}
          <VerticalToolbar />
          
          {/* Floating Horizontal Editor Bar - Bottom (only shows when node selected) */}
          <HorizontalEditorBar selectedNodeId={selectedNodeId} />
        </div>
        
        {/* Right Panel - Toolbar Settings - Only show when creating a new node */}
        {selectedNodeType && !selectedNodeId ? (
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col">
            <ToolbarSettingsPanel 
              selectedNodeType={selectedNodeType}
              onClose={() => setSelectedNodeType(null)}
            />
        </aside>
        ) : null}
      </div>
      
      {/* Emoji Picker Popup */}
      {emojiPickerOpen && emojiPickerNode && (
        <EmojiPickerPopup
          node={emojiPickerNode}
          position={emojiPickerPosition}
          onClose={() => setEmojiPickerOpen(false)}
          onSelect={handleEmojiSelect}
        />
      )}
      
      {/* Capture Modal - Removed to avoid widget in middle of page */}
      {/* TODO: Replace with alternative capture UI if needed */}
      {false && (
      <CaptureModal
        isOpen={captureModalOpen}
        onClose={() => {
          setCaptureModalOpen(false);
          setCaptureNodeId(null);
          if ((window as any).currentScreenStream) {
            (window as any).currentScreenStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            delete (window as any).currentScreenStream;
          }
        }}
        onCapture={handleCaptureComplete}
        isLiveCapture={
          captureNodeId 
            ? (() => {
                const node = nodes.find(n => n.id === captureNodeId);
                return node && typeof node.content === 'object' && node.content?.type === 'live-capture';
              })()
            : true // If no captureNodeId, it's a new live-capture node
        }
        onScreenCapture={async (area, stream) => {
          // Handle screen area selection for live capture with live stream
          if (!stream) {
            console.error('No screen stream available');
            setCaptureModalOpen(false);
            setCaptureNodeId(null);
            return;
          }

          try {
            // Get the captured image URL from CaptureModal (for thumbnail)
            const imageUrl = (window as any).lastCapturedImageUrl || '';
            
            // If updating existing node
            if (captureNodeId) {
              setScreenCaptureNodeId(captureNodeId);
              setScreenCaptureStream(stream);
              setScreenCaptureArea(area);
              setShowScreenCapturePreview(false);
              setCaptureModalOpen(false);
              
              // Update node with selected area and stream info
              const node = nodes.find(n => n.id === captureNodeId);
              if (node) {
                const currentContent = typeof node.content === 'object' && node.content?.type === 'live-capture'
                  ? node.content
                  : { type: 'live-capture', imageUrl: '', cropArea: { x: 0, y: 0, width: 0, height: 0 }, captureHistory: [] };
                
                // Calculate screen bounds for interactive mode
                // The area coordinates are relative to the video stream, but we need actual screen coordinates
                // For now, we'll store the crop area as screen bounds - this will be improved with actual screen coordinate tracking
                const screenBounds = area; // TODO: Get actual screen coordinates from video metadata
                
                // Store stream in global registry BEFORE updating node to ensure it's available when node re-renders
                if (!(window as any).liveCaptureStreams) {
                  (window as any).liveCaptureStreams = new Map();
                }
                
                // Store the stream directly - don't clone it as tracks are shared anyway
                // The modal will NOT stop this stream when closing for live capture
                (window as any).liveCaptureStreams.set(captureNodeId, {
                  stream,
                  cropArea: area,
                  screenBounds, // Store screen bounds for interactive mode
                });
                
                // Dispatch event to notify LiveCaptureNode that stream is ready
                window.dispatchEvent(new CustomEvent('live-capture-stream-ready', {
                  detail: { nodeId: captureNodeId }
                }));
                
                updateNode(captureNodeId, {
                  content: {
                    ...currentContent,
                    type: 'live-capture',
                    cropArea: area,
                    screenBounds, // Store screen bounds for interactive mode
                    imageUrl, // Thumbnail
                    streamId: stream.id, // Store stream ID for reference
                    isLiveStream: true, // Flag to indicate live stream
                  },
                });
              }
              setCaptureNodeId(null);
            } else {
              // Create new node with live stream
              const storedFlowPos = (window as any).lastFlowPosition || { x: 500, y: 400 };
              const captureMode = (window as any).liveCaptureMode || 'custom';
              
              try {
                const response = await fetch('/api/nodes/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    workspaceId,
                    title: 'Live Capture',
                    type: 'live-capture',
                    content: {
                      type: 'live-capture',
                      imageUrl, // Thumbnail
                      cropArea: area,
                      screenBounds: area, // Store screen bounds for interactive mode (same as crop area for now)
                      streamId: stream.id,
                      isLiveStream: true,
                      captureMode,
                      interactive: false, // Default to non-interactive
                      captureHistory: imageUrl ? [{
                        imageUrl,
                        timestamp: new Date().toISOString(),
                      }] : [],
                      timestamp: new Date().toISOString(),
                    },
                    tags: ['live-capture'],
                    x: storedFlowPos.x,
                    y: storedFlowPos.y,
                  }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.node) {
                    // Verify stream is still active before storing
                    const tracks = stream.getVideoTracks();
                    console.log('[CanvasPageClient] Storing stream for node', data.node.id, {
                      streamId: stream.id,
                      trackCount: tracks.length,
                      tracksActive: tracks.every(t => t.readyState === 'live' || t.readyState === 'ended'),
                      readyStates: tracks.map(t => t.readyState),
                      streamActive: stream.active
                    });
                    
                    if (tracks.length === 0 || !tracks.some(t => t.readyState === 'live' || t.readyState === 'ended')) {
                      console.error('[CanvasPageClient] Stream has no active tracks, cannot store');
                      alert('Error: Screen capture stream is not active. Please try capturing again.');
                      return;
                    }
                    
                    // Store stream in global registry BEFORE adding node to ensure it's available when node renders
                    if (!(window as any).liveCaptureStreams) {
                      (window as any).liveCaptureStreams = new Map();
                    }
                    
                    // Store the stream directly - don't clone it as tracks are shared anyway
                    // The modal will NOT stop this stream when closing for live capture
                    (window as any).liveCaptureStreams.set(data.node.id, {
                      stream,
                      cropArea: area,
                      screenBounds: area, // Store screen bounds for interactive mode
                    });
                    
                    console.log('[CanvasPageClient] Stream stored in registry for node', data.node.id);
                    console.log('[CanvasPageClient] Registry now has', (window as any).liveCaptureStreams.size, 'streams');
                    
                    // Dispatch event to notify LiveCaptureNode that stream is ready
                    window.dispatchEvent(new CustomEvent('live-capture-stream-ready', {
                      detail: { nodeId: data.node.id }
                    }));
                    
                    console.log('[CanvasPageClient] Dispatched live-capture-stream-ready event for node', data.node.id);
                    
                    // Now add the node - stream is already in registry
                    addNode(data.node);
                    selectNode(data.node.id);
                    
                    (window as any).lastFlowPosition = null;
                  }
                }
              } catch (error) {
                console.error('Error creating capture node:', error);
                alert('Failed to create capture node');
              }
              
              setCaptureModalOpen(false);
              setCaptureNodeId(null);
            }
            
            // Clean up
            delete (window as any).lastCapturedImageUrl;
            delete (window as any).liveCaptureMode;
          } catch (error) {
            console.error('Error capturing screen area:', error);
            alert('Failed to capture screen area. Please try again.');
            setCaptureModalOpen(false);
            setCaptureNodeId(null);
            delete (window as any).lastCapturedImageUrl;
            delete (window as any).liveCaptureMode;
          }
        }}
        captureMode={(window as any).liveCaptureMode || 'custom'}
      />
      )}
      
      {/* Clipboard Monitor for Live Capture Nodes */}
      <ClipboardMonitor
        enabled={activeCaptureNodes.size > 0}
        onNewImage={handleClipboardImage}
      />
      
      {/* Native Window Configuration Modal */}
      <NativeWindowConfigModal
        isOpen={nativeWindowConfigOpen}
        onClose={() => {
          setNativeWindowConfigOpen(false);
          setPendingNativeWindowType(null);
        }}
        onConfirm={handleNativeWindowConfigConfirm}
      />
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}
