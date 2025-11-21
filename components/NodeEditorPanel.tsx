'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { X, Tag, Sparkles, ArrowRight, Link2, Image as ImageIcon, Upload, Copy } from 'lucide-react';
import FloatingFormatToolbar from './FloatingFormatToolbar';
import SlashCommandMenu from './SlashCommandMenu';
import ChartEditorPanel from './ChartEditorPanel';
import ImageSettingsPanel from './ImageSettingsPanel';
import TextSettingsPanel from './TextSettingsPanel';
import ShapeSettingsPanel from './ShapeSettingsPanel';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';

function isChartNode(node: Node): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  const chartTypes = ['bar-chart', 'line-chart', 'pie-chart', 'area-chart'];
  return chartTypes.some(type => node.tags?.includes(type));
}

function isImageNode(node: Node): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('image');
}

function isBoxOrCircleNode(node: Node): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('box') || node.tags.includes('circle');
}

export default function NodeEditorPanel() {
  const { selectedNodeId } = useCanvasStore();
  const { nodes, edges, updateNode } = useWorkspaceStore();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
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
    // Only initialize with content if it's not a chart node
    content: selectedNode && !isChartNode(selectedNode)
      ? (typeof selectedNode.content === 'string' 
          ? selectedNode.content 
          : (selectedNode.content && typeof selectedNode.content === 'object' && selectedNode.content.type === 'doc'
              ? selectedNode.content
              : ''))
      : '',
    onUpdate: ({ editor }) => {
      if (selectedNode && !isChartNode(selectedNode)) {
        // Only update content for non-chart nodes
        // Chart nodes use ChartEditorPanel which updates content directly
        debouncedApiUpdate(selectedNode.id, {
          content: editor.getJSON(),
        });
      }
    },
    // Disable editor for chart nodes to prevent errors
    editable: !selectedNode || !isChartNode(selectedNode),
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
    if (selectedNode) {
      // Only update title if:
      // 1. Node ID changed (switched to different node), OR
      // 2. Title input is not focused (user finished editing)
      if (!isTitleFocusedRef.current || title === '' || title === selectedNode.title) {
        setTitle(selectedNode.title);
      }
      setTags(selectedNode.tags || []);
      
      // Load image data if it's an image node
      if (isImageNode(selectedNode)) {
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
      
      // Only set editor content for non-chart and non-image nodes
      if (editor && !isChartNode(selectedNode) && !isImageNode(selectedNode)) {
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
          editor.commands.setContent(newContent);
        }
      }
    } else {
      setTitle('');
      setTags([]);
      isTitleFocusedRef.current = false;
      if (editor) {
        // Only clear if there's content
        const currentContent = editor.getJSON();
        const isEmpty = !currentContent || (currentContent.type === 'doc' && (!currentContent.content || currentContent.content.length === 0));
        if (!isEmpty) {
          editor.commands.clearContent();
        }
      }
    }
    // Only sync when node ID changes, not when title/tags/content change
    // This prevents overwriting user input while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id]);

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

  if (!selectedNode) {
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

            {/* Chart Editor, Image Editor, or Rich Text Editor */}
            {isChartNode(selectedNode) ? (
              <ChartEditorPanel
                node={selectedNode}
                onUpdate={async (config) => {
                  // Update store immediately for instant UI feedback
                  updateNode(selectedNode.id, {
                    content: { chart: config },
                  });
                  
                  // Sync to API
                  if (workspaceId) {
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
                  }
                }}
              />
            ) : isImageNode(selectedNode) ? (
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
            ) : isBoxOrCircleNode(selectedNode) ? (
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
