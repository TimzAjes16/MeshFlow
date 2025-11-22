'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { X, Tag, Sparkles, ArrowRight, Link2, Image as ImageIcon, Upload, Copy, Camera } from 'lucide-react';
import FloatingFormatToolbar from './FloatingFormatToolbar';
import SlashCommandMenu from './SlashCommandMenu';
import ChartEditorPanel from './ChartEditorPanel';
import ImageSettingsPanel from './ImageSettingsPanel';
import TextSettingsPanel from './TextSettingsPanel';
import ShapeSettingsPanel from './ShapeSettingsPanel';
import LinkSettingsPanel from './LinkSettingsPanel';
import NodeTransformPanel from './NodeTransformPanel';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';
import { getNodeType, hasEditableText, isChartNode, isShapeNode, isMediaNode } from '@/lib/nodeTypes';

// Type-based helper functions using the new registry
function isChartNodeType(node: Node): boolean {
  return isChartNode(node);
}

function isImageNodeType(node: Node): boolean {
  return isMediaNode(node);
}

function isLiveCaptureNodeType(node: Node): boolean {
  const type = getNodeType(node);
  return type === 'live-capture';
}

function isBoxOrCircleNodeType(node: Node): boolean {
  return isShapeNode(node);
}

function isArrowNodeType(node: Node): boolean {
  const type = getNodeType(node);
  return type === 'arrow';
}

function isLinkNodeType(node: Node): boolean {
  const type = getNodeType(node);
  return type === 'link';
}

function isEmojiNodeType(node: Node): boolean {
  const type = getNodeType(node);
  return type === 'emoji';
}

export default function NodeEditorPanel() {
  const { selectedNodeId } = useCanvasStore();
  const { nodes, edges, updateNode } = useWorkspaceStore();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  // Use useMemo to find selectedNode to avoid unnecessary re-renders
  const selectedNode = useMemo(() => {
    return selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  }, [selectedNodeId, nodes]);
  
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [linkedNodes, setLinkedNodes] = useState<Node[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large' | 'full'>('medium');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isTitleFocusedRef = useRef(false);
  
  // Debounce timer refs for API calls
  const titleUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const contentUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to prevent editor onUpdate from firing when we're syncing content from node
  const isSyncingContentRef = useRef(false);
  // Track the last node ID we synced to prevent re-syncing the same node
  const lastSyncedNodeIdRef = useRef<string | null>(null);

  // Debounced API update function
  const debouncedApiUpdate = useCallback(
    async (nodeId: string, updates: Partial<Node>) => {
      if (!workspaceId) return;
      
      // Update local store immediately for instant UI feedback
      updateNode(nodeId, updates);
      
      // Clear existing timer
      if (contentUpdateTimer.current) {
        clearTimeout(contentUpdateTimer.current);
      }
      
      // Debounce API call by 500ms
      contentUpdateTimer.current = setTimeout(async () => {
        try {
          setIsUpdating(true);
          const response = await fetch('/api/nodes/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId,
              ...updates,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Update store with response from API to ensure sync (only if different to prevent loops)
            if (data.node) {
              updateNode(nodeId, data.node);
            }
            // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
          }
        } catch (error) {
          console.error('Error updating node:', error);
        } finally {
          setIsUpdating(false);
        }
      }, 500);
    },
    [workspaceId, updateNode]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your thoughts...',
      }),
    ],
    // Only initialize with content if node has editable text (using type-based check)
    content: selectedNode && hasEditableText(selectedNode)
      ? (typeof selectedNode.content === 'string' 
          ? selectedNode.content 
          : (selectedNode.content && typeof selectedNode.content === 'object' && selectedNode.content.type === 'doc'
              ? selectedNode.content
              : ''))
      : '',
    onUpdate: ({ editor }) => {
      // Don't trigger update if we're currently syncing content from node (prevents infinite loop)
      if (isSyncingContentRef.current) {
        return;
      }
      
      // Only update content for nodes with editable text (using type-based check)
      if (selectedNode && hasEditableText(selectedNode)) {
        // Measure editor content to calculate dimensions
        const editorElement = editor.view.dom;
        if (editorElement) {
          const rect = editorElement.getBoundingClientRect();
          const width = Math.max(200, Math.min(400, rect.width + 32)); // Add padding
          const height = Math.max(60, rect.height + 32);
          
          debouncedApiUpdate(selectedNode.id, {
            content: editor.getJSON(),
            width,
            height,
          });
        } else {
          debouncedApiUpdate(selectedNode.id, {
            content: editor.getJSON(),
          });
        }
      }
    },
    // Enable editor only for nodes with editable text (using type-based check)
    editable: !selectedNode || hasEditableText(selectedNode),
  });

  // Fetch linked nodes when selected node changes
  useEffect(() => {
    if (selectedNode && edges) {
      // Find all edges connected to this node (both source and target)
      const connectedEdges = edges.filter(
        (edge) => edge.source === selectedNode.id || edge.target === selectedNode.id
      );
      
      // Get all linked node IDs (exclude the selected node itself)
      const linkedNodeIds = connectedEdges
        .map((edge) => (edge.source === selectedNode.id ? edge.target : edge.source))
        .filter((id) => id !== selectedNode.id);
      
      // Get the actual node objects
      const linked = nodes.filter((node) => linkedNodeIds.includes(node.id));
      setLinkedNodes(linked);
    } else {
      setLinkedNodes([]);
    }
  }, [selectedNode, edges, nodes]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (titleUpdateTimer.current) clearTimeout(titleUpdateTimer.current);
      if (contentUpdateTimer.current) clearTimeout(contentUpdateTimer.current);
    };
  }, []);

  // Sync with workspace store changes - only when node ID changes or when not editing
  useEffect(() => {
    // Only sync if node ID actually changed (not just object reference)
    if (selectedNode && selectedNode.id !== lastSyncedNodeIdRef.current) {
      lastSyncedNodeIdRef.current = selectedNode.id;
      // Only update title if:
      // 1. Node ID changed (switched to different node), OR
      // 2. Title input is not focused (user finished editing)
      if (!isTitleFocusedRef.current || title === '' || title === selectedNode.title) {
        setTitle(selectedNode.title);
      }
      setTags(selectedNode.tags || []);
      
      // Load image data if it's an image node
      if (isImageNodeType(selectedNode)) {
        const imageData = selectedNode.content && typeof selectedNode.content === 'object' && 'image' in selectedNode.content
          ? (selectedNode.content as any).image
          : null;
        if (imageData) {
          setImageUrl(imageData.url || '');
          setImageSize(imageData.size || 'medium');
        } else {
          setImageUrl('');
          setImageSize('medium');
        }
      }
      
      // Only set editor content for nodes with editable text
      if (editor && hasEditableText(selectedNode)) {
        // Get current editor content to avoid unnecessary updates
        const currentContent = editor.getJSON();
        const nodeContent = selectedNode.content;
        
        // Check if content is TipTap JSON format or plain string
        let shouldUpdate = false;
        let newContent: any = '';
        
        if (typeof nodeContent === 'string') {
          newContent = nodeContent;
          // Only update if content is different
          const currentText = editor.getText();
          shouldUpdate = currentText !== nodeContent;
        } else if (nodeContent && typeof nodeContent === 'object' && nodeContent.type === 'doc') {
          newContent = nodeContent;
          // Only update if JSON is different
          shouldUpdate = JSON.stringify(currentContent) !== JSON.stringify(nodeContent);
        } else {
          newContent = '';
          shouldUpdate = JSON.stringify(currentContent) !== JSON.stringify({ type: 'doc', content: [] });
        }
        
        // Only update if content actually changed to prevent infinite loops
        if (shouldUpdate) {
          // Set flag to prevent onUpdate from firing during sync
          isSyncingContentRef.current = true;
          editor.commands.setContent(newContent);
          // Reset flag after a brief delay to allow editor to update
          setTimeout(() => {
            isSyncingContentRef.current = false;
          }, 100);
        }
      }
    } else if (selectedNodeId === null && lastSyncedNodeIdRef.current !== null) {
      // Node was deselected - clear state
      lastSyncedNodeIdRef.current = null;
      setTitle('');
      setTags([]);
      isTitleFocusedRef.current = false;
      if (editor) {
        // Only clear if there's content
        const currentContent = editor.getJSON();
        const isEmpty = !currentContent || (currentContent.type === 'doc' && (!currentContent.content || currentContent.content.length === 0));
        if (!isEmpty) {
          isSyncingContentRef.current = true;
          editor.commands.clearContent();
          setTimeout(() => {
            isSyncingContentRef.current = false;
          }, 100);
        }
      }
    }
    // Only sync when node ID changes, not when title/tags/content change
    // This prevents overwriting user input while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  // Debounced title update function
  const debouncedTitleUpdate = useCallback(
    async (nodeId: string, newTitle: string) => {
      if (!workspaceId) return;
      
      // Update local store immediately for instant UI feedback
      updateNode(nodeId, { title: newTitle });
      
      // Clear existing timer
      if (titleUpdateTimer.current) {
        clearTimeout(titleUpdateTimer.current);
      }
      
      // Debounce API call by 500ms
      titleUpdateTimer.current = setTimeout(async () => {
        try {
          setIsUpdating(true);
          const response = await fetch('/api/nodes/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId,
              title: newTitle,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Update store with response from API (only if different to prevent loops)
            if (data.node) {
              updateNode(nodeId, data.node);
            }
            // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
          }
        } catch (error) {
          console.error('Error updating node title:', error);
        } finally {
          setIsUpdating(false);
        }
      }, 500);
    },
    [workspaceId, updateNode]
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Update immediately for real-time feedback
    if (selectedNode) {
      debouncedTitleUpdate(selectedNode.id, value);
    }
  };

  // Memoize chart update callback to prevent ChartEditorPanel from re-rendering unnecessarily
  const handleChartUpdate = useCallback(async (config: {
    data: { name: string; value: number; [key: string]: string | number }[];
    xKey?: string;
    yKey?: string;
    color?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    size?: 'small' | 'medium' | 'large';
    colorPreset?: 'blue' | 'purple' | 'green' | 'red';
  }) => {
    if (!selectedNode || !workspaceId) return;
    
    // Update store immediately for instant UI feedback
    updateNode(selectedNode.id, {
      content: { chart: config },
    });
    
    // Sync to API
    try {
      setIsUpdating(true);
      const response = await fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selectedNode.id,
          content: { chart: config },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          updateNode(selectedNode.id, data.node);
        }
        // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
      }
    } catch (error) {
      console.error('Error updating chart:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [selectedNode, workspaceId, updateNode]);

  const handleTitleFocus = () => {
    isTitleFocusedRef.current = true;
  };

  const handleTitleBlur = () => {
    isTitleFocusedRef.current = false;
    // Clear any pending timer and save immediately
    if (titleUpdateTimer.current) {
      clearTimeout(titleUpdateTimer.current);
      titleUpdateTimer.current = null;
    }
    // Final save is handled by debouncedTitleUpdate
    // Sync with store after blur to ensure consistency
    if (selectedNode && title !== selectedNode.title) {
      setTitle(selectedNode.title);
    }
  };

  const handleAddTag = async () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const newTags = [...tags, newTag.trim()];
      setTags(newTags);
      setNewTag('');
      if (selectedNode && workspaceId) {
        // Update store immediately
        updateNode(selectedNode.id, { tags: newTags });
        // Sync to API
        try {
          await fetch('/api/nodes/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId: selectedNode.id,
              tags: newTags,
            }),
          });
          // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
        } catch (error) {
          console.error('Error updating tags:', error);
        }
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    if (selectedNode && workspaceId) {
      // Update store immediately
      updateNode(selectedNode.id, { tags: newTags });
      // Sync to API
      try {
        await fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: selectedNode.id,
            tags: newTags,
          }),
        });
        // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
      } catch (error) {
        console.error('Error updating tags:', error);
      }
    }
  };

  const handleSummarize = async () => {
    if (!selectedNode || !workspaceId) return;
    
    try {
      setIsUpdating(true);
      // TODO: Implement AI summarization API call
      // For now, show a message
      alert('AI Summarization feature coming soon!');
    } catch (error) {
      console.error('Error summarizing:', error);
      alert('Failed to summarize. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExpandIdea = async () => {
    if (!selectedNode || !workspaceId) return;
    
    try {
      setIsUpdating(true);
      // TODO: Implement AI expansion API call
      // For now, show a message
      alert('AI Expansion feature coming soon!');
    } catch (error) {
      console.error('Error expanding idea:', error);
      alert('Failed to expand idea. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Show loading state if node is selected but not loaded yet
  if (selectedNodeId && !selectedNode) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Loading node...
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please wait while the node loads
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show empty state if nothing is selected
  if (!selectedNodeId || !selectedNode) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nothing selected
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Click a node to edit it
            </p>
            <div className="text-xs text-gray-400 space-y-1 pt-4 border-t border-gray-200">
              <p>💡 Tip: Double-click the canvas to create a new node</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Edit Node</h2>
          {isUpdating && (
            <span className="text-xs text-gray-500 animate-pulse">Saving...</span>
          )}
        </div>
        <button
          onClick={() => useCanvasStore.getState().selectNode(null)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Title */}
            <div>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onFocus={handleTitleFocus}
                onBlur={handleTitleBlur}
                placeholder="Node title..."
                autoFocus
                className="w-full px-3 py-2 text-lg font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Chart Editor, Image Editor, Link Editor, or Rich Text Editor */}
            {isChartNodeType(selectedNode) ? (
              <ChartEditorPanel
                node={selectedNode}
                onUpdate={handleChartUpdate}
              />
            ) : isLinkNodeType(selectedNode) ? (
              <div className="space-y-6">
                {/* Link Settings Panel */}
                <LinkSettingsPanel
                  node={selectedNode}
                  onUpdate={async (config) => {
                    updateNode(selectedNode.id, {
                      content: { link: config },
                    });
                    
                    if (workspaceId) {
                      try {
                        setIsUpdating(true);
                        const response = await fetch('/api/nodes/update', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nodeId: selectedNode.id,
                            content: { link: config },
                          }),
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          if (data.node) {
                            updateNode(selectedNode.id, data.node);
                          }
                          // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
                        }
                      } catch (error) {
                        console.error('Error updating link settings:', error);
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                />
              </div>
            ) : isLiveCaptureNodeType(selectedNode) ? (
              <div className="space-y-6">
                {/* Live Capture Panel */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Live Capture</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Track changes to a specific area over time. Update captures to build a history.
                  </p>
                  
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('update-capture-node', { detail: { nodeId: selectedNode.id } }));
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Camera className="w-5 h-5" />
                    Update Capture
                  </button>
                  
                  {/* Capture History */}
                  {selectedNode.content && typeof selectedNode.content === 'object' && 
                   selectedNode.content.type === 'live-capture' &&
                   (selectedNode.content as any).captureHistory &&
                   (selectedNode.content as any).captureHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">
                        Capture History ({(selectedNode.content as any).captureHistory.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...(selectedNode.content as any).captureHistory].reverse().map((capture: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <img
                              src={capture.imageUrl}
                              alt={`Capture ${(selectedNode.content as any).captureHistory.length - index}`}
                              className="w-16 h-16 object-cover rounded border border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900">
                                Capture {(selectedNode.content as any).captureHistory.length - index}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(capture.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isImageNodeType(selectedNode) ? (
              <div className="space-y-6">
                {/* Image Settings Panel */}
                <ImageSettingsPanel
                  node={selectedNode}
                  onUpdate={async (config) => {
                    const imageData = selectedNode.content && typeof selectedNode.content === 'object' && 'image' in selectedNode.content
                      ? (selectedNode.content as any).image
                      : {};
                    
                    updateNode(selectedNode.id, {
                      content: { image: { ...imageData, ...config } },
                    });
                    
                    if (workspaceId) {
                      try {
                        setIsUpdating(true);
                        const response = await fetch('/api/nodes/update', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nodeId: selectedNode.id,
                            content: { image: { ...imageData, ...config } },
                          }),
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          if (data.node) {
                            updateNode(selectedNode.id, data.node);
                          }
                          // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
                        }
                      } catch (error) {
                        console.error('Error updating image settings:', error);
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                />
                
                {/* Image Upload Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Image</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {imageUrl ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <img
                            src={imageUrl}
                            alt={selectedNode.title}
                            className={`mx-auto rounded-lg ${
                              imageSize === 'small' ? 'max-w-[200px]' :
                              imageSize === 'medium' ? 'max-w-[400px]' :
                              imageSize === 'large' ? 'max-w-[600px]' :
                              'w-full'
                            }`}
                          />
                        </div>
                        <button
                          onClick={async () => {
                            setImageUrl('');
                            updateNode(selectedNode.id, { content: {} });
                            
                            if (workspaceId) {
                              try {
                                setIsUpdating(true);
                                const response = await fetch('/api/nodes/update', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    nodeId: selectedNode.id,
                                    content: {},
                                  }),
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.node) {
                                    updateNode(selectedNode.id, data.node);
                                  }
                                  // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
                                }
                              } catch (error) {
                                console.error('Error removing image:', error);
                              } finally {
                                setIsUpdating(false);
                              }
                            }
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Upload an image or paste from clipboard</p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              Browse
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const clipboardItems = await navigator.clipboard.read();
                                  for (const item of clipboardItems) {
                                    if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                                      const blob = await item.getType('image/png') || await item.getType('image/jpeg');
                                      const reader = new FileReader();
                                      reader.onloadend = async () => {
                                        const base64 = reader.result as string;
                                        setImageUrl(base64);
                                        
                                        const imageData = selectedNode.content && typeof selectedNode.content === 'object' && 'image' in selectedNode.content
                                          ? (selectedNode.content as any).image
                                          : {};
                                        
                                        const newImageData = { ...imageData, url: base64, size: imageData.size || imageSize };
                                        
                                        updateNode(selectedNode.id, {
                                          content: { image: newImageData },
                                        });
                                        
                                        if (workspaceId) {
                                          try {
                                            setIsUpdating(true);
                                            const response = await fetch('/api/nodes/update', {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                nodeId: selectedNode.id,
                                                content: { image: newImageData },
                                              }),
                                            });
                                            
                                            if (response.ok) {
                                              const data = await response.json();
                                              if (data.node) {
                                                updateNode(selectedNode.id, data.node);
                                              }
                                              // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
                                            }
                                          } catch (error) {
                                            console.error('Error pasting image:', error);
                                          } finally {
                                            setIsUpdating(false);
                                          }
                                        }
                                      };
                                      reader.readAsDataURL(blob);
                                      break;
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error pasting image:', error);
                                  alert('Could not paste image. Please try uploading instead.');
                                }
                              }}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Paste
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64 = reader.result as string;
                            setImageUrl(base64);
                            
                            const imageData = selectedNode.content && typeof selectedNode.content === 'object' && 'image' in selectedNode.content
                              ? (selectedNode.content as any).image
                              : {};
                            
                            const newImageData = { ...imageData, url: base64, size: imageData.size || imageSize };
                            
                            updateNode(selectedNode.id, {
                              content: { image: newImageData },
                            });
                            
                            if (workspaceId) {
                              try {
                                setIsUpdating(true);
                                const response = await fetch('/api/nodes/update', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    nodeId: selectedNode.id,
                                    content: { image: newImageData },
                                  }),
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.node) {
                                    updateNode(selectedNode.id, data.node);
                                  }
                                  // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
                                }
                              } catch (error) {
                                console.error('Error uploading image:', error);
                              } finally {
                                setIsUpdating(false);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : isEmojiNodeType(selectedNode) ? (
              <div className="space-y-6">
                {/* Emoji Info */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Emoji</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <div className="text-6xl flex items-center justify-center gap-2 flex-wrap">
                        {(() => {
                          let emojis: string[] = [];
                          if (selectedNode.content && typeof selectedNode.content === 'object' && 'emoji' in selectedNode.content) {
                            const emojiData = (selectedNode.content as any).emoji;
                            if (Array.isArray(emojiData)) {
                              emojis = emojiData;
                            } else if (typeof emojiData === 'string') {
                              emojis = [emojiData];
                            }
                          }
                          if (emojis.length === 0 && selectedNode.title) {
                            emojis = Array.from(selectedNode.title).filter((char) => {
                              const codePoint = char.codePointAt(0);
                              return codePoint && (
                                (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) ||
                                (codePoint >= 0x1F600 && codePoint <= 0x1F64F) ||
                                (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) ||
                                (codePoint >= 0x2600 && codePoint <= 0x26FF) ||
                                (codePoint >= 0x2700 && codePoint <= 0x27BF)
                              );
                            });
                          }
                          if (emojis.length === 0) {
                            emojis = ['😀'];
                          }
                          return emojis.map((emoji, idx) => <span key={idx}>{emoji}</span>);
                        })()}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900 font-medium mb-1">
                        Click the emoji node on the canvas
                      </p>
                      <p className="text-xs text-blue-700">
                        to open the emoji picker and add multiple emojis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isArrowNodeType(selectedNode) ? (
              <div className="space-y-6">
                {/* Arrow Settings Panel */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Arrow Settings</h3>
                  <div className="space-y-4">
                    {/* Arrow Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Arrow Type
                      </label>
                      <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                        {[
                          { id: 'right', label: '→', name: 'Right' },
                          { id: 'left', label: '←', name: 'Left' },
                          { id: 'up', label: '↑', name: 'Up' },
                          { id: 'down', label: '↓', name: 'Down' },
                          { id: 'up-right', label: '↗', name: 'Up Right' },
                          { id: 'down-right', label: '↘', name: 'Down Right' },
                          { id: 'down-left', label: '↙', name: 'Down Left' },
                          { id: 'up-left', label: '↖', name: 'Up Left' },
                          { id: 'double-horizontal', label: '↔', name: 'Double Horizontal' },
                          { id: 'double-vertical', label: '↕', name: 'Double Vertical' },
                          { id: 'curved-right', label: '↷', name: 'Curved Right' },
                          { id: 'curved-left', label: '↶', name: 'Curved Left' },
                        ].map((arrow) => {
                          const dir = arrow.id;
                          const arrowSettings = selectedNode.content && typeof selectedNode.content === 'object' && 'arrow' in selectedNode.content
                            ? (selectedNode.content as any).arrow
                            : { direction: 'right' };
                          const isSelected = (arrowSettings?.direction || 'right') === dir;
                          return (
                            <button
                              key={dir}
                              onClick={async () => {
                                const currentArrow = selectedNode.content && typeof selectedNode.content === 'object' && 'arrow' in selectedNode.content
                                  ? (selectedNode.content as any).arrow
                                  : { direction: 'right', color: '#1f2937', thickness: 4 };
                                
                                const newArrow = { ...currentArrow, direction: dir };
                                const currentContent = selectedNode.content && typeof selectedNode.content === 'object'
                                  ? { ...selectedNode.content, arrow: newArrow }
                                  : { arrow: newArrow };
                                
                                updateNode(selectedNode.id, {
                                  content: currentContent,
                                });
                                
                                if (workspaceId) {
                                  try {
                                    setIsUpdating(true);
                                    const response = await fetch('/api/nodes/update', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        nodeId: selectedNode.id,
                                        content: currentContent,
                                      }),
                                    });
                                    
                                    if (response.ok) {
                                      const data = await response.json();
                                      if (data.node) {
                                        updateNode(selectedNode.id, data.node);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error updating arrow direction:', error);
                                  } finally {
                                    setIsUpdating(false);
                                  }
                                }
                              }}
                              className={`p-3 border-2 rounded-lg transition-colors flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              title={arrow.name}
                            >
                              <div className="text-2xl mb-1">{arrow.label}</div>
                              <div className="text-xs text-gray-500 text-center leading-tight">{arrow.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Thickness */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Width
                      </label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="2"
                          max="20"
                          value={(() => {
                            const arrowSettings = selectedNode.content && typeof selectedNode.content === 'object' && 'arrow' in selectedNode.content
                              ? (selectedNode.content as any).arrow
                              : { direction: 'right', color: '#1f2937', thickness: 4 };
                            return arrowSettings?.thickness || 4;
                          })()}
                          onChange={async (e) => {
                            const thickness = parseInt(e.target.value);
                            const currentArrow = selectedNode.content && typeof selectedNode.content === 'object' && 'arrow' in selectedNode.content
                              ? (selectedNode.content as any).arrow
                              : { direction: 'right', color: '#1f2937', thickness: 4 };
                            
                            const newArrow = { ...currentArrow, thickness };
                            const currentContent = selectedNode.content && typeof selectedNode.content === 'object'
                              ? { ...selectedNode.content, arrow: newArrow }
                              : { arrow: newArrow };
                            
                            updateNode(selectedNode.id, {
                              content: currentContent,
                            });
                            
                            if (workspaceId) {
                              try {
                                setIsUpdating(true);
                                const response = await fetch('/api/nodes/update', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    nodeId: selectedNode.id,
                                    content: currentContent,
                                  }),
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.node) {
                                    updateNode(selectedNode.id, data.node);
                                  }
                                }
                              } catch (error) {
                                console.error('Error updating arrow thickness:', error);
                              } finally {
                                setIsUpdating(false);
                              }
                            }
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <p className="text-right text-xs text-gray-500">
                          {(() => {
                            const arrowSettings = selectedNode.content && typeof selectedNode.content === 'object' && 'arrow' in selectedNode.content
                              ? (selectedNode.content as any).arrow
                              : { direction: 'right', color: '#1f2937', thickness: 4 };
                            return `${arrowSettings?.thickness || 4}px`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Color Wall */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <div className="grid grid-cols-8 gap-1.5">
                        {[
                          // Grays and blacks
                          '#000000', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb',
                          // Blues
                          '#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#eff6ff',
                          // Purples
                          '#581c87', '#6b21a8', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff', '#f3e8ff',
                          // Greens
                          '#14532d', '#166534', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7',
                          // Yellows/Oranges
                          '#78350f', '#92400e', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7',
                          // Reds/Pinks
                          '#7f1d1d', '#991b1b', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2',
                          // Teals/Cyans
                          '#134e4a', '#155e75', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1',
                          // Indigos
                          '#312e81', '#3730a3', '#4338ca', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff',
                        ].map((color) => {
                          const arrowSettings = selectedNode.content && typeof selectedNode.content === 'object' && 'arrow' in selectedNode.content
                            ? (selectedNode.content as any).arrow
                            : { direction: 'right', color: '#1f2937', thickness: 4 };
                          const isSelected = (arrowSettings?.color || '#1f2937') === color;
                          return (
                            <button
                              key={color}
                              onClick={async () => {
                                const currentArrow = selectedNode.content && typeof selectedNode.content === 'object' && 'arrow' in selectedNode.content
                                  ? (selectedNode.content as any).arrow
                                  : { direction: 'right', color: '#1f2937', thickness: 4 };
                                
                                const newArrow = { ...currentArrow, color };
                                const currentContent = selectedNode.content && typeof selectedNode.content === 'object'
                                  ? { ...selectedNode.content, arrow: newArrow }
                                  : { arrow: newArrow };
                                
                                updateNode(selectedNode.id, {
                                  content: currentContent,
                                });
                                
                                if (workspaceId) {
                                  try {
                                    setIsUpdating(true);
                                    const response = await fetch('/api/nodes/update', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        nodeId: selectedNode.id,
                                        content: currentContent,
                                      }),
                                    });
                                    
                                    if (response.ok) {
                                      const data = await response.json();
                                      if (data.node) {
                                        updateNode(selectedNode.id, data.node);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error updating arrow color:', error);
                                  } finally {
                                    setIsUpdating(false);
                                  }
                                }
                              }}
                              className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                                isSelected
                                  ? 'border-blue-500 ring-2 ring-blue-200 scale-110'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isBoxOrCircleNodeType(selectedNode) ? (
              <div className="space-y-6">
                {/* Shape Settings Panel */}
                <ShapeSettingsPanel
                  node={selectedNode}
                  onUpdate={async (config) => {
                    const shapeData = selectedNode.content && typeof selectedNode.content === 'object' && 'shapeSettings' in selectedNode.content
                      ? (selectedNode.content as any).shapeSettings
                      : {};
                    
                    // Preserve existing content (text content, etc.) and merge shape settings
                    const currentContent = selectedNode.content && typeof selectedNode.content === 'object'
                      ? { ...selectedNode.content, shapeSettings: { ...shapeData, ...config } }
                      : { shapeSettings: { ...shapeData, ...config } };
                    
                    updateNode(selectedNode.id, {
                      content: currentContent,
                    });
                    
                    if (workspaceId) {
                      try {
                        setIsUpdating(true);
                        const response = await fetch('/api/nodes/update', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nodeId: selectedNode.id,
                            content: currentContent,
                          }),
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          if (data.node) {
                            updateNode(selectedNode.id, data.node);
                          }
                          // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
                        }
                      } catch (error) {
                        console.error('Error updating shape settings:', error);
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                />
                
                {/* Rich Text Editor for Box/Circle Content */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Content</h3>
                  <div className="relative border border-gray-200 rounded-lg min-h-[200px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors" style={{ overflow: 'visible', zIndex: 1 }}>
                    <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 focus:outline-none" />
                    
                    {/* Floating Format Toolbar */}
                    {editor && <FloatingFormatToolbar editor={editor} />}
                    
                    {/* Slash Command Menu */}
                    {editor && <SlashCommandMenu editor={editor} />}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Text Settings Panel */}
                <TextSettingsPanel
                  node={selectedNode}
                  onUpdate={async (config) => {
                    const currentContent = selectedNode.content || {};
                    const newContent = {
                      ...currentContent,
                      textSettings: config,
                    };
                    
                    updateNode(selectedNode.id, {
                      content: newContent,
                    });
                    
                    if (workspaceId) {
                      try {
                        setIsUpdating(true);
                        const response = await fetch('/api/nodes/update', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nodeId: selectedNode.id,
                            content: newContent,
                          }),
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          if (data.node) {
                            updateNode(selectedNode.id, data.node);
                          }
                          // Don't dispatch refreshWorkspace - optimistic updates handle UI, polling will sync
                        }
                      } catch (error) {
                        console.error('Error updating text settings:', error);
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                />

                {/* Rich Text Editor */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Content</h3>
                  <div className="relative border border-gray-200 rounded-lg min-h-[200px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors" style={{ overflow: 'visible', zIndex: 1 }}>
                    <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 focus:outline-none" />
                    
                    {/* Floating Format Toolbar - appears when text is selected - rendered outside editor container */}
                    {editor && <FloatingFormatToolbar editor={editor} />}
                    
                    {/* Slash Command Menu - appears when typing / - rendered outside editor container */}
                    {editor && <SlashCommandMenu editor={editor} />}
                  </div>
                </div>
              </div>
            )}

        {/* Transform Controls - Expand and Rotate - Available on ALL node types */}
        <NodeTransformPanel
          node={selectedNode}
          onUpdate={async (updates) => {
            // Update store immediately
            updateNode(selectedNode.id, updates);
            
            // Sync to API
            if (workspaceId) {
              try {
                setIsUpdating(true);
                const response = await fetch('/api/nodes/update', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nodeId: selectedNode.id,
                    ...updates,
                  }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.node) {
                    updateNode(selectedNode.id, data.node);
                  }
                }
              } catch (error) {
                console.error('Error updating node transform:', error);
              } finally {
                setIsUpdating(false);
              }
            }
          }}
        />

        {/* Tags */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Tags</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>

        {/* AI Actions */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <button
            onClick={handleSummarize}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4 text-gray-600" />
            <span>Summarize with AI</span>
          </button>
          <button
            onClick={handleExpandIdea}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-gray-600" />
            <span>Expand idea</span>
          </button>
        </div>

        {/* Linked Nodes */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Linked Nodes</span>
          </div>
          {linkedNodes.length === 0 ? (
            <div className="mt-2 text-sm text-gray-500">No linked nodes yet</div>
          ) : (
            <div className="mt-2 space-y-2">
              {linkedNodes.map((linkedNode) => (
                <button
                  key={linkedNode.id}
                  onClick={() => {
                    useCanvasStore.getState().selectNode(linkedNode.id);
                    // Dispatch zoom-to-node event
                    window.dispatchEvent(new CustomEvent('zoom-to-node', {
                      detail: { nodeId: linkedNode.id }
                    }));
                  }}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="font-medium text-gray-900">{linkedNode.title || 'Untitled'}</div>
                  {linkedNode.tags && linkedNode.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {linkedNode.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
