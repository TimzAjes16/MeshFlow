'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { 
  X, Tag, Sparkles, ArrowRight, Link2, 
  Image as ImageIcon, Upload, Copy, 
  ChevronDown, Type, AlignLeft, Settings,
  Type as FontSizeIcon, Palette as PaletteIcon,
  Square, Layers, ArrowUp, ArrowDown, 
  BringToFront, SendToBack, BringForward, SendBackward
} from 'lucide-react';
import FloatingFormatToolbar from './FloatingFormatToolbar';
import SlashCommandMenu from './SlashCommandMenu';
import ChartEditorPanel from './ChartEditorPanel';
import ImageSettingsPanel from './ImageSettingsPanel';
import TextSettingsPanel from './TextSettingsPanel';
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

function isEmojiNode(node: Node): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('emoji');
}

export default function FloatingNodeEditor() {
  const { selectedNodeId } = useCanvasStore();
  const { nodes, edges, updateNode } = useWorkspaceStore();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [linkedNodes, setLinkedNodes] = useState<Node[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large' | 'full'>('medium');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Debounce timer refs
  const titleUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const contentUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounced API update function
  const debouncedApiUpdate = useCallback(
    async (nodeId: string, updates: Partial<Node>) => {
      if (!workspaceId) return;
      
      updateNode(nodeId, updates);
      
      if (contentUpdateTimer.current) {
        clearTimeout(contentUpdateTimer.current);
      }
      
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
            if (data.node) {
              updateNode(nodeId, data.node);
            }
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
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
        placeholder: 'Start typing...',
      }),
    ],
    content: selectedNode && !isChartNode(selectedNode) && !isImageNode(selectedNode)
      ? (typeof selectedNode.content === 'string' 
          ? selectedNode.content 
          : (selectedNode.content && typeof selectedNode.content === 'object' && selectedNode.content.type === 'doc'
              ? selectedNode.content
              : ''))
      : '',
    onUpdate: ({ editor }) => {
      if (selectedNode && !isChartNode(selectedNode) && !isImageNode(selectedNode)) {
        debouncedApiUpdate(selectedNode.id, {
          content: editor.getJSON(),
        });
      }
    },
    editable: !selectedNode || (!isChartNode(selectedNode) && !isImageNode(selectedNode)),
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const dropdown = dropdownRefs.current[openDropdown];
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Sync with selected node
  useEffect(() => {
    if (selectedNode) {
      setTitle(selectedNode.title);
      setTags(selectedNode.tags || []);
      
      if (isImageNode(selectedNode)) {
        const imageData = selectedNode.content && typeof selectedNode.content === 'object' && 'image' in selectedNode.content
          ? (selectedNode.content as any).image
          : null;
        if (imageData) {
          setImageUrl(imageData.url || '');
          setImageSize(imageData.size || 'medium');
        }
      }
      
      if (editor && !isChartNode(selectedNode) && !isImageNode(selectedNode)) {
        const nodeContent = selectedNode.content;
        let newContent: any = '';
        
        if (typeof nodeContent === 'string') {
          newContent = nodeContent;
        } else if (nodeContent && typeof nodeContent === 'object' && nodeContent.type === 'doc') {
          newContent = nodeContent;
        } else {
          newContent = '';
        }
        
        editor.commands.setContent(newContent);
      }
    } else {
      setTitle('');
      setTags([]);
      if (editor) {
        editor.commands.clearContent();
      }
    }
  }, [selectedNode?.id, editor]);

  // Fetch linked nodes
  useEffect(() => {
    if (selectedNode && edges) {
      const connectedEdges = edges.filter(
        (edge) => edge.source === selectedNode.id || edge.target === selectedNode.id
      );
      
      const linkedNodeIds = connectedEdges
        .map((edge) => (edge.source === selectedNode.id ? edge.target : edge.source))
        .filter((id) => id !== selectedNode.id);
      
      const linked = nodes.filter((node) => linkedNodeIds.includes(node.id));
      setLinkedNodes(linked);
    } else {
      setLinkedNodes([]);
    }
  }, [selectedNode, edges, nodes]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (titleUpdateTimer.current) clearTimeout(titleUpdateTimer.current);
      if (contentUpdateTimer.current) clearTimeout(contentUpdateTimer.current);
    };
  }, []);

  // Debounced title update
  const debouncedTitleUpdate = useCallback(
    async (nodeId: string, newTitle: string) => {
      if (!workspaceId) return;
      
      updateNode(nodeId, { title: newTitle });
      
      if (titleUpdateTimer.current) {
        clearTimeout(titleUpdateTimer.current);
      }
      
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
            if (data.node) {
              updateNode(nodeId, data.node);
            }
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
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
    if (selectedNode) {
      debouncedTitleUpdate(selectedNode.id, value);
    }
  };

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  // Layering functions
  const handleLayerAction = useCallback(async (action: 'bringToFront' | 'moveToBack' | 'moveForward' | 'moveBackward') => {
    if (!selectedNode || !workspaceId || !nodes) return;

    // Get current zIndex from nodeMetadata
    const nodeMetadata = selectedNode.content && typeof selectedNode.content === 'object' && 'nodeMetadata' in selectedNode.content
      ? (selectedNode.content as any).nodeMetadata
      : {};
    const currentZIndex = nodeMetadata.zIndex || 0;

    // Get all nodes sorted by current zIndex
    const allNodes = [...nodes];
    const sortedNodes = allNodes.sort((a, b) => {
      const aMetadata = a.content && typeof a.content === 'object' && 'nodeMetadata' in a.content
        ? (a.content as any).nodeMetadata
        : {};
      const bMetadata = b.content && typeof b.content === 'object' && 'nodeMetadata' in b.content
        ? (b.content as any).nodeMetadata
        : {};
      return (aMetadata.zIndex || 0) - (bMetadata.zIndex || 0);
    });

    let newZIndex = currentZIndex;

    switch (action) {
      case 'bringToFront':
        // Set to highest zIndex + 1
        const maxZIndex = Math.max(...sortedNodes.map(n => {
          const meta = n.content && typeof n.content === 'object' && 'nodeMetadata' in n.content
            ? (n.content as any).nodeMetadata
            : {};
          return meta.zIndex || 0;
        }));
        newZIndex = maxZIndex + 1;
        break;
      case 'moveToBack':
        // Set to lowest zIndex - 1
        const minZIndex = Math.min(...sortedNodes.map(n => {
          const meta = n.content && typeof n.content === 'object' && 'nodeMetadata' in n.content
            ? (n.content as any).nodeMetadata
            : {};
          return meta.zIndex || 0;
        }));
        newZIndex = minZIndex - 1;
        break;
      case 'moveForward':
        // Find the node with the next highest zIndex and swap
        const nextNode = sortedNodes.find(n => {
          if (n.id === selectedNode.id) return false;
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
          // Swap zIndices
          const currentContent = selectedNode.content || {};
          const nextContent = nextNode.content || {};
          updateNode(selectedNode.id, {
            content: {
              ...currentContent,
              nodeMetadata: { ...nodeMetadata, zIndex: nextZIndex },
            },
          });
          updateNode(nextNode.id, {
            content: {
              ...nextContent,
              nodeMetadata: { ...nextMeta, zIndex: currentZIndex },
            },
          });
          // Update both in database
          await Promise.all([
            fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: selectedNode.id,
                content: { ...currentContent, nodeMetadata: { ...nodeMetadata, zIndex: nextZIndex } },
              }),
            }),
            fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: nextNode.id,
                content: { ...nextContent, nodeMetadata: { ...nextMeta, zIndex: currentZIndex } },
              }),
            }),
          ]);
          window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          return;
        }
        newZIndex = currentZIndex + 1;
        break;
      case 'moveBackward':
        // Find the node with the next lowest zIndex and swap
        const prevNode = [...sortedNodes].reverse().find(n => {
          if (n.id === selectedNode.id) return false;
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
          // Swap zIndices
          const currentContent = selectedNode.content || {};
          const prevContent = prevNode.content || {};
          updateNode(selectedNode.id, {
            content: {
              ...currentContent,
              nodeMetadata: { ...nodeMetadata, zIndex: prevZIndex },
            },
          });
          updateNode(prevNode.id, {
            content: {
              ...prevContent,
              nodeMetadata: { ...prevMeta, zIndex: currentZIndex },
            },
          });
          // Update both in database
          await Promise.all([
            fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: selectedNode.id,
                content: { ...currentContent, nodeMetadata: { ...nodeMetadata, zIndex: prevZIndex } },
              }),
            }),
            fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: prevNode.id,
                content: { ...prevContent, nodeMetadata: { ...prevMeta, zIndex: currentZIndex } },
              }),
            }),
          ]);
          window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          return;
        }
        newZIndex = currentZIndex - 1;
        break;
    }

    // Update zIndex
    const currentContent = selectedNode.content || {};
    const newContent = {
      ...currentContent,
      nodeMetadata: {
        ...nodeMetadata,
        zIndex: newZIndex,
      },
    };
    updateNode(selectedNode.id, { content: newContent });
    
    if (workspaceId) {
      try {
        await fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: selectedNode.id,
            content: newContent,
          }),
        });
        window.dispatchEvent(new CustomEvent('refreshWorkspace'));
      } catch (error) {
        console.error('Error updating layer:', error);
      }
    }
  }, [selectedNode, workspaceId, nodes, updateNode]);

  if (!selectedNode) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex items-center gap-2 px-4 py-3 min-w-[600px] max-w-[90vw]">
        {/* Close Button */}
        <button
          onClick={() => useCanvasStore.getState().selectNode(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Title Input */}
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Node title..."
          className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
        />

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Settings Dropdown - for text formatting options */}
        {!isChartNode(selectedNode) && !isImageNode(selectedNode) && (
          <>
            {/* Font Size Dropdown */}
            <div className="relative" ref={(el) => (dropdownRefs.current['fontSize'] = el)}>
              <button
                onClick={() => toggleDropdown('fontSize')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <FontSizeIcon className="w-4 h-4" />
                <span>Size</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'fontSize' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'fontSize' && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50">
                  {[
                    { value: 'small', label: 'Small', size: '14px' },
                    { value: 'medium', label: 'Medium', size: '16px' },
                    { value: 'large', label: 'Large', size: '18px' },
                    { value: 'xlarge', label: 'Extra Large', size: '20px' },
                  ].map((option) => {
                    const currentSize = (selectedNode.content && typeof selectedNode.content === 'object' && 'textSettings' in selectedNode.content
                      ? (selectedNode.content as any).textSettings?.fontSize
                      : 'medium') || 'medium';
                    const isSelected = currentSize === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          const currentContent = selectedNode.content || {};
                          const textSettings = currentContent && typeof currentContent === 'object' && 'textSettings' in currentContent
                            ? (currentContent as any).textSettings
                            : {};
                          const newContent = {
                            ...currentContent,
                            textSettings: { ...textSettings, fontSize: option.value },
                          };
                          updateNode(selectedNode.id, { content: newContent });
                          if (workspaceId) {
                            fetch('/api/nodes/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                nodeId: selectedNode.id,
                                content: newContent,
                              }),
                            }).then(() => {
                              window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                            });
                          }
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all mb-2 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option.label} ({option.size})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Font Family Dropdown */}
            <div className="relative" ref={(el) => (dropdownRefs.current['fontFamily'] = el)}>
              <button
                onClick={() => toggleDropdown('fontFamily')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <PaletteIcon className="w-4 h-4" />
                <span>Font</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'fontFamily' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'fontFamily' && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50">
                  {[
                    { value: 'sans', label: 'Sans Serif', font: 'Inter, system-ui, sans-serif' },
                    { value: 'serif', label: 'Serif', font: 'Georgia, serif' },
                    { value: 'mono', label: 'Monospace', font: 'Monaco, monospace' },
                  ].map((option) => {
                    const currentFamily = (selectedNode.content && typeof selectedNode.content === 'object' && 'textSettings' in selectedNode.content
                      ? (selectedNode.content as any).textSettings?.fontFamily
                      : 'sans') || 'sans';
                    const isSelected = currentFamily === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          const currentContent = selectedNode.content || {};
                          const textSettings = currentContent && typeof currentContent === 'object' && 'textSettings' in currentContent
                            ? (currentContent as any).textSettings
                            : {};
                          const newContent = {
                            ...currentContent,
                            textSettings: { ...textSettings, fontFamily: option.value },
                          };
                          updateNode(selectedNode.id, { content: newContent });
                          if (workspaceId) {
                            fetch('/api/nodes/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                nodeId: selectedNode.id,
                                content: newContent,
                              }),
                            }).then(() => {
                              window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                            });
                          }
                          setOpenDropdown(null);
                        }}
                        style={{ fontFamily: option.font }}
                        className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all mb-2 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Text Alignment Dropdown */}
            <div className="relative" ref={(el) => (dropdownRefs.current['alignment'] = el)}>
              <button
                onClick={() => toggleDropdown('alignment')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <AlignLeft className="w-4 h-4" />
                <span>Align</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'alignment' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'alignment' && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[150px] z-50">
                  {[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' },
                    { value: 'justify', label: 'Justify' },
                  ].map((option) => {
                    const currentAlignment = (selectedNode.content && typeof selectedNode.content === 'object' && 'textSettings' in selectedNode.content
                      ? (selectedNode.content as any).textSettings?.alignment
                      : 'left') || 'left';
                    const isSelected = currentAlignment === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          const currentContent = selectedNode.content || {};
                          const textSettings = currentContent && typeof currentContent === 'object' && 'textSettings' in currentContent
                            ? (currentContent as any).textSettings
                            : {};
                          const newContent = {
                            ...currentContent,
                            textSettings: { ...textSettings, alignment: option.value },
                          };
                          updateNode(selectedNode.id, { content: newContent });
                          if (workspaceId) {
                            fetch('/api/nodes/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                nodeId: selectedNode.id,
                                content: newContent,
                              }),
                            }).then(() => {
                              window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                            });
                          }
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all mb-2 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Content Dropdown - for rich text editor */}
        {!isChartNode(selectedNode) && !isImageNode(selectedNode) && (
          <div className="relative" ref={(el) => (dropdownRefs.current['content'] = el)}>
            <button
              onClick={() => toggleDropdown('content')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <Type className="w-4 h-4" />
              <span>Editor</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'content' ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === 'content' && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-[600px] max-h-[70vh] overflow-y-auto z-50">
                <div className="relative border border-gray-200 rounded-lg min-h-[300px] focus-within:ring-2 focus-within:ring-blue-500">
                  {editor && (
                    <>
                      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3" />
                      <FloatingFormatToolbar editor={editor} />
                      <SlashCommandMenu editor={editor} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Content Dropdown - for charts */}
        {isChartNode(selectedNode) && (
          <div className="relative" ref={(el) => (dropdownRefs.current['content'] = el)}>
            <button
              onClick={() => toggleDropdown('content')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <Type className="w-4 h-4" />
              <span>Chart</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'content' ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === 'content' && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-[600px] max-h-[70vh] overflow-y-auto z-50">
                <ChartEditorPanel
                  node={selectedNode}
                  onUpdate={async (config) => {
                    updateNode(selectedNode.id, { content: { chart: config } });
                    if (workspaceId) {
                      try {
                        const response = await fetch('/api/nodes/update', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nodeId: selectedNode.id,
                            content: { chart: config },
                          }),
                        });
                        if (response.ok) {
                          window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                        }
                      } catch (error) {
                        console.error('Error updating chart:', error);
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Content Dropdown - for images */}
        {isImageNode(selectedNode) && (
          <div className="relative" ref={(el) => (dropdownRefs.current['content'] = el)}>
            <button
              onClick={() => toggleDropdown('content')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Image</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'content' ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === 'content' && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-[600px] max-h-[70vh] overflow-y-auto z-50">
                <ImageSettingsPanel
                  node={selectedNode}
                  onUpdate={async (config) => {
                    const imageData = selectedNode.content && typeof selectedNode.content === 'object' && 'image' in selectedNode.content
                      ? (selectedNode.content as any).image
                      : {};
                    updateNode(selectedNode.id, { content: { image: { ...imageData, ...config } } });
                    if (workspaceId) {
                      try {
                        const response = await fetch('/api/nodes/update', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nodeId: selectedNode.id,
                            content: { image: { ...imageData, ...config } },
                          }),
                        });
                        if (response.ok) {
                          window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                        }
                      } catch (error) {
                        console.error('Error updating image:', error);
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Fill Dropdown - for emoji nodes */}
        {isEmojiNode(selectedNode) && (
          <div className="relative" ref={(el) => (dropdownRefs.current['fill'] = el)}>
            <button
              onClick={() => toggleDropdown('fill')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <Square className="w-4 h-4" />
              <span>Fill</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'fill' ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === 'fill' && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[250px] z-50">
                <div className="space-y-3">
                  {/* Fill Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Fill Background</label>
                    <button
                      onClick={() => {
                        const currentContent = selectedNode.content || {};
                        const emojiData = currentContent && typeof currentContent === 'object' && 'emoji' in currentContent
                          ? (currentContent as any).emoji
                          : (selectedNode.title || '😀');
                        const emojiSettings = currentContent && typeof currentContent === 'object' && 'emojiSettings' in currentContent
                          ? (currentContent as any).emojiSettings
                          : { fill: true, fillColor: '#ffffff', borderColor: '#d1d5db', borderWidth: 2 };
                        const newFill = !emojiSettings.fill;
                        const newContent = {
                          ...currentContent,
                          emoji: emojiData,
                          emojiSettings: { ...emojiSettings, fill: newFill },
                        };
                        updateNode(selectedNode.id, { content: newContent });
                        if (workspaceId) {
                          fetch('/api/nodes/update', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              nodeId: selectedNode.id,
                              content: newContent,
                            }),
                          }).then(() => {
                            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                            setOpenDropdown(null);
                          });
                        } else {
                          setOpenDropdown(null);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (selectedNode.content && typeof selectedNode.content === 'object' && 'emojiSettings' in selectedNode.content
                          ? (selectedNode.content as any).emojiSettings?.fill !== false
                          : true)
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          (selectedNode.content && typeof selectedNode.content === 'object' && 'emojiSettings' in selectedNode.content
                            ? (selectedNode.content as any).emojiSettings?.fill !== false
                            : true)
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Fill Color Picker */}
                  {(selectedNode.content && typeof selectedNode.content === 'object' && 'emojiSettings' in selectedNode.content
                    ? (selectedNode.content as any).emojiSettings?.fill !== false
                    : true) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Fill Color</label>
                      <div className="flex gap-2">
                        {[
                          { value: '#ffffff', label: 'White', color: '#ffffff' },
                          { value: '#f3f4f6', label: 'Light Gray', color: '#f3f4f6' },
                          { value: '#fef3c7', label: 'Yellow', color: '#fef3c7' },
                          { value: '#dbeafe', label: 'Blue', color: '#dbeafe' },
                          { value: '#fce7f3', label: 'Pink', color: '#fce7f3' },
                          { value: '#d1fae5', label: 'Green', color: '#d1fae5' },
                        ].map((option) => {
                          const currentFillColor = (selectedNode.content && typeof selectedNode.content === 'object' && 'emojiSettings' in selectedNode.content
                            ? (selectedNode.content as any).emojiSettings?.fillColor
                            : '#ffffff') || '#ffffff';
                          const isSelected = currentFillColor === option.value;

                          return (
                            <button
                              key={option.value}
                              onClick={() => {
                                const currentContent = selectedNode.content || {};
                                const emojiData = currentContent && typeof currentContent === 'object' && 'emoji' in currentContent
                                  ? (currentContent as any).emoji
                                  : (selectedNode.title || '😀');
                                const emojiSettings = currentContent && typeof currentContent === 'object' && 'emojiSettings' in currentContent
                                  ? (currentContent as any).emojiSettings
                                  : { fill: true, fillColor: '#ffffff', borderColor: '#d1d5db', borderWidth: 2 };
                                const newContent = {
                                  ...currentContent,
                                  emoji: emojiData,
                                  emojiSettings: { ...emojiSettings, fillColor: option.value },
                                };
                                updateNode(selectedNode.id, { content: newContent });
                                if (workspaceId) {
                                  fetch('/api/nodes/update', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      nodeId: selectedNode.id,
                                      content: newContent,
                                    }),
                                  }).then(() => {
                                    window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                                  });
                                }
                              }}
                              className={`w-8 h-8 rounded border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 ring-2 ring-blue-200'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              style={{ backgroundColor: option.color }}
                              title={option.label}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layer/Layering Dropdown */}
        <div className="relative" ref={(el) => (dropdownRefs.current['layer'] = el)}>
          <button
            onClick={() => toggleDropdown('layer')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Layer</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'layer' ? 'rotate-180' : ''}`} />
          </button>
          
          {openDropdown === 'layer' && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50">
              <div className="space-y-1">
                <button
                  onClick={() => {
                    handleLayerAction('bringToFront');
                    setOpenDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <BringToFront className="w-4 h-4" />
                  <span>Bring to Front</span>
                  <span className="ml-auto text-xs text-gray-400">Ctrl+]</span>
                </button>
                <button
                  onClick={() => {
                    handleLayerAction('moveForward');
                    setOpenDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Move Forward</span>
                  <span className="ml-auto text-xs text-gray-400">Ctrl+↑</span>
                </button>
                <button
                  onClick={() => {
                    handleLayerAction('moveBackward');
                    setOpenDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                  <span>Move Backward</span>
                  <span className="ml-auto text-xs text-gray-400">Ctrl+↓</span>
                </button>
                <button
                  onClick={() => {
                    handleLayerAction('moveToBack');
                    setOpenDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <SendToBack className="w-4 h-4" />
                  <span>Send to Back</span>
                  <span className="ml-auto text-xs text-gray-400">Ctrl+[</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tags Dropdown */}
        <div className="relative" ref={(el) => (dropdownRefs.current['tags'] = el)}>
          <button
            onClick={() => toggleDropdown('tags')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <Tag className="w-4 h-4" />
            <span>Tags</span>
            {tags.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {tags.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'tags' ? 'rotate-180' : ''}`} />
          </button>
          
          {openDropdown === 'tags' && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[300px]">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full"
                    >
                      {tag}
                      <button
                        onClick={async () => {
                          const newTags = tags.filter((t) => t !== tag);
                          setTags(newTags);
                          updateNode(selectedNode.id, { tags: newTags });
                          if (workspaceId) {
                            try {
                              await fetch('/api/nodes/update', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  nodeId: selectedNode.id,
                                  tags: newTags,
                                }),
                              });
                              window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                            } catch (error) {
                              console.error('Error updating tags:', error);
                            }
                          }
                        }}
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
                        if (newTag.trim() && !tags.includes(newTag.trim())) {
                          const newTags = [...tags, newTag.trim()];
                          setTags(newTags);
                          setNewTag('');
                          updateNode(selectedNode.id, { tags: newTags });
                          if (workspaceId) {
                            fetch('/api/nodes/update', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                nodeId: selectedNode.id,
                                tags: newTags,
                              }),
                            }).then(() => {
                              window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                            });
                          }
                        }
                      }
                    }}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (newTag.trim() && !tags.includes(newTag.trim())) {
                        const newTags = [...tags, newTag.trim()];
                        setTags(newTags);
                        setNewTag('');
                        updateNode(selectedNode.id, { tags: newTags });
                        if (workspaceId) {
                          fetch('/api/nodes/update', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              nodeId: selectedNode.id,
                              tags: newTags,
                            }),
                          }).then(() => {
                            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
                          });
                        }
                      }
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Linked Nodes Dropdown */}
        {linkedNodes.length > 0 && (
          <div className="relative" ref={(el) => (dropdownRefs.current['linked'] = el)}>
            <button
              onClick={() => toggleDropdown('linked')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <Link2 className="w-4 h-4" />
              <span>Linked</span>
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {linkedNodes.length}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'linked' ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === 'linked' && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[300px] max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {linkedNodes.map((linkedNode) => (
                    <button
                      key={linkedNode.id}
                      onClick={() => {
                        useCanvasStore.getState().selectNode(linkedNode.id);
                        window.dispatchEvent(new CustomEvent('zoom-to-node', {
                          detail: { nodeId: linkedNode.id }
                        }));
                        setOpenDropdown(null);
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
              </div>
            )}
          </div>
        )}

        {/* AI Actions Dropdown */}
        <div className="relative" ref={(el) => (dropdownRefs.current['ai'] = el)}>
          <button
            onClick={() => toggleDropdown('ai')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'ai' ? 'rotate-180' : ''}`} />
          </button>
          
          {openDropdown === 'ai' && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px]">
              <button
                onClick={() => {
                  alert('AI Summarization coming soon!');
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-gray-600" />
                <span>Summarize</span>
              </button>
              <button
                onClick={() => {
                  alert('AI Expansion coming soon!');
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4 text-gray-600" />
                <span>Expand idea</span>
              </button>
            </div>
          )}
        </div>

        {/* Saving Indicator */}
        {isUpdating && (
          <span className="text-xs text-gray-500 animate-pulse ml-auto">Saving...</span>
        )}
      </div>
    </div>
  );
}

