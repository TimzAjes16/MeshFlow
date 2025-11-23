'use client';

import { useCallback, useState, useEffect } from 'react';
import CanvasContainer from './CanvasContainer';
import VerticalToolbar from './VerticalToolbar';
import HorizontalEditorBar from './HorizontalEditorBar';
import DrawingCanvas from './DrawingCanvas';
import KeyboardShortcuts from './KeyboardShortcuts';
import ToolbarSettingsPanel from './ToolbarSettingsPanel';
import EmojiPickerPopup from './EmojiPickerPopup';
import CaptureModal from './CaptureModal';
import ClipboardMonitor from './ClipboardMonitor';
import ScreenCaptureMonitor from './ScreenCaptureMonitor';
import ScreenCapturePreview from './ScreenCapturePreview';
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
  const [screenCaptureNodeId, setScreenCaptureNodeId] = useState<string | null>(null); // Node currently being monitored via screen capture
  const [screenCaptureArea, setScreenCaptureArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [screenCaptureStream, setScreenCaptureStream] = useState<MediaStream | null>(null);
  const [showScreenCapturePreview, setShowScreenCapturePreview] = useState(false);

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
      
      if (isLiveCaptureNode) {
        // For live capture nodes, trigger screen capture directly
        handleStartScreenCaptureForNode(nodeId);
      } else {
        // For regular capture, show upload/paste modal
        setCaptureNodeId(nodeId);
        setCaptureModalOpen(true);
      }
    };
    
    const handleStartScreenCaptureForNode = async (nodeId: string) => {
      try {
        // Use screen capture utility that works in both Electron and browser
        const { getScreenCaptureStream } = await import('@/lib/electronUtils');
        const stream = await getScreenCaptureStream();

        setScreenCaptureNodeId(nodeId);
        setScreenCaptureStream(stream);
        setShowScreenCapturePreview(true);

        // Handle stream end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setScreenCaptureStream(null);
          setShowScreenCapturePreview(false);
          setScreenCaptureNodeId(null);
          setScreenCaptureArea(null);
        });

      } catch (error) {
        console.error('Error starting screen capture:', error);
      }
    };
    
    const handleStartScreenCapture = (event: CustomEvent) => {
      const { nodeId, captureArea } = event.detail;
      setScreenCaptureNodeId(nodeId);
      setScreenCaptureArea(captureArea);
    };
    
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
    
    window.addEventListener('update-capture-node', handleUpdateCaptureNode as EventListener);
    window.addEventListener('start-screen-capture', handleStartScreenCapture as EventListener);
    window.addEventListener('open-live-capture-modal', handleOpenLiveCaptureModal as EventListener);
    window.addEventListener('recrop-live-capture', handleRecropLiveCapture as EventListener);
    
    return () => {
      window.removeEventListener('update-capture-node', handleUpdateCaptureNode as EventListener);
      window.removeEventListener('start-screen-capture', handleStartScreenCapture as EventListener);
      window.removeEventListener('open-live-capture-modal', handleOpenLiveCaptureModal as EventListener);
      window.removeEventListener('recrop-live-capture', handleRecropLiveCapture as EventListener);
    };
  }, []); // Empty dependency array since we access nodes from store directly

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

  // Handle screen capture frames
  const handleScreenCapture = useCallback(
    async (imageUrl: string) => {
      if (!screenCaptureNodeId) return;
      
      const node = nodes.find(n => n.id === screenCaptureNodeId);
      if (!node) return;

      const currentContent = typeof node.content === 'object' && node.content?.type === 'live-capture'
        ? node.content
        : { type: 'live-capture', imageUrl: '', cropArea: { x: 0, y: 0, width: 0, height: 0 }, captureHistory: [] };
      
      const captureHistory = currentContent.captureHistory || [];
      const newCapture = {
        imageUrl,
        timestamp: new Date().toISOString(),
      };
      
      updateNode(screenCaptureNodeId, {
        content: {
          ...currentContent,
          type: 'live-capture',
          imageUrl,
          captureHistory: [...captureHistory, newCapture],
          timestamp: new Date().toISOString(),
        },
      });
      
      // Persist to API
      try {
        const response = await fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: screenCaptureNodeId,
            content: {
              ...currentContent,
              type: 'live-capture',
              imageUrl,
              captureHistory: [...captureHistory, newCapture],
              timestamp: new Date().toISOString(),
            },
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.node) {
            updateNode(screenCaptureNodeId, data.node);
          }
        }
      } catch (error) {
        console.error('Error updating capture node from screen capture:', error);
      }
    },
    [screenCaptureNodeId, nodes, updateNode]
  );

  // Handle screen area selection from preview
  const handleScreenAreaSelected = useCallback((area: { x: number; y: number; width: number; height: number }) => {
    if (screenCaptureNodeId && screenCaptureStream) {
      // Close preview and start monitoring
      setScreenCaptureArea(area);
      setShowScreenCapturePreview(false);
      
      // Update the node with the selected area
      const node = nodes.find(n => n.id === screenCaptureNodeId);
      if (node) {
        const currentContent = typeof node.content === 'object' && node.content?.type === 'live-capture'
          ? node.content
          : { type: 'live-capture', imageUrl: '', cropArea: { x: 0, y: 0, width: 0, height: 0 }, captureHistory: [] };
        
        updateNode(screenCaptureNodeId, {
          content: {
            ...currentContent,
            type: 'live-capture',
            cropArea: area,
          },
        });
      }
    }
  }, [screenCaptureNodeId, screenCaptureStream, nodes, updateNode]);

  const handleScreenCaptureCancel = useCallback(() => {
    // Stop the stream
    if (screenCaptureStream) {
      screenCaptureStream.getTracks().forEach(track => track.stop());
    }
    setScreenCaptureStream(null);
    setShowScreenCapturePreview(false);
    setScreenCaptureNodeId(null);
    setScreenCaptureArea(null);
  }, [screenCaptureStream]);

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
    async (type: string = 'note', screenPosition: { x: number; y: number }) => {
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

        // Default chart data for chart nodes
        const getDefaultChartContent = (type: string) => {
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
            title: getDefaultNodeTitle(type as any),
            type: type, // Explicit type (following Miro/Notion pattern)
            content: getDefaultNodeContent(type as any),
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
      
      {/* Capture Modal - Shows croppable area selection for live capture nodes */}
      <CaptureModal
        isOpen={captureModalOpen}
        onClose={() => {
          setCaptureModalOpen(false);
          setCaptureNodeId(null);
          if (screenCaptureStream) {
            screenCaptureStream.getTracks().forEach(track => track.stop());
            setScreenCaptureStream(null);
          }
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
                    addNode(data.node);
                    selectNode(data.node.id);
                    
                    // Set up live stream monitoring
                    setScreenCaptureNodeId(data.node.id);
                    setScreenCaptureStream(stream);
                    setScreenCaptureArea(area);
                    
                    // Store stream in global registry for LiveCaptureNode to access
                    if (!(window as any).liveCaptureStreams) {
                      (window as any).liveCaptureStreams = new Map();
                    }
                    (window as any).liveCaptureStreams.set(data.node.id, {
                      stream,
                      cropArea: area,
                      screenBounds: area, // Store screen bounds for interactive mode
                    });
                    
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
      
      {/* Clipboard Monitor for Live Capture Nodes */}
      <ClipboardMonitor
        enabled={activeCaptureNodes.size > 0}
        onNewImage={handleClipboardImage}
      />
      
      {/* Screen Capture Preview - Apple-style preview with cropping */}
      <ScreenCapturePreview
        isOpen={showScreenCapturePreview}
        stream={screenCaptureStream}
        onCapture={handleScreenAreaSelected}
        onCancel={handleScreenCaptureCancel}
      />
      
      {/* Screen Capture Monitor for continuous monitoring (runs in background) */}
      <ScreenCaptureMonitor
        enabled={screenCaptureNodeId !== null && !showScreenCapturePreview && screenCaptureArea !== null}
        stream={screenCaptureStream}
        captureArea={screenCaptureArea || undefined}
        interval={2000} // Capture every 2 seconds
        onCapture={handleScreenCapture}
        onError={(error: Error) => {
          console.error('Screen capture error:', error);
          if (screenCaptureStream) {
            screenCaptureStream.getTracks().forEach(track => track.stop());
          }
          setScreenCaptureStream(null);
          setScreenCaptureNodeId(null);
          setScreenCaptureArea(null);
          setShowScreenCapturePreview(false);
        }}
      />
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}
