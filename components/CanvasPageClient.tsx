'use client';

import { useCallback, useState, useEffect } from 'react';
import CanvasContainer from './CanvasContainer';
import FloatingNodeEditor from './FloatingNodeEditor';
import FloatingHorizontalBar from './FloatingHorizontalBar';
import KeyboardShortcuts from './KeyboardShortcuts';
import CanvasSidebar from './CanvasSidebar';
import ToolbarSettingsPanel from './ToolbarSettingsPanel';
import NodeEditorPanel from './NodeEditorPanel';
import EmojiPickerPopup from './EmojiPickerPopup';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import type { Node } from '@/types/Node';

interface CanvasPageClientProps {
  workspaceId: string;
}

export default function CanvasPageClient({ workspaceId }: CanvasPageClientProps) {
  const { nodes, addNode, updateNode } = useWorkspaceStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const [isCreating, setIsCreating] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerNode, setEmojiPickerNode] = useState<Node | null>(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Clear selectedNodeType when node is deselected
  useEffect(() => {
    if (!selectedNodeId) {
      setSelectedNodeType(null);
      setToolbarPosition(null); // Also clear toolbar position when deselected
    }
  }, [selectedNodeId]);

  const handleCreateNode = useCallback(
    async (type: string = 'note', screenPosition: { x: number; y: number }) => {
      console.log('handleCreateNode called with type:', type, 'position:', screenPosition);
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
            title: titles[type] || 'New Node',
            content: type === 'text' 
              ? { type: 'doc', content: [{ type: 'paragraph' }] } 
              : (type.includes('chart') ? getDefaultChartContent(type) : (type === 'emoji' ? { emoji: '😀' } : (type === 'arrow' ? { arrow: { direction: 'right' } } : {}))),
            tags: [type],
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
            
            // Trigger empty state dismissal if needed
            const dismissEvent = new CustomEvent('dismiss-empty-state');
            window.dispatchEvent(dismissEvent);
            
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
        // Allow Ctrl/Cmd+N when typing
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
          e.preventDefault();
          // Dispatch event to show horizontal bar
          const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          };
          window.dispatchEvent(new CustomEvent('show-create-toolbar', { detail: viewportCenter }));
          // Store center position as flow position
          (window as any).lastFlowPosition = { x: 500, y: 400 };
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
            }).then(() => window.dispatchEvent(new CustomEvent('refreshWorkspace')));
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
            }).then(() => window.dispatchEvent(new CustomEvent('refreshWorkspace')));
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
              }).then(() => window.dispatchEvent(new CustomEvent('refreshWorkspace')));
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
              }).then(() => window.dispatchEvent(new CustomEvent('refreshWorkspace')));
            }
            return;
          }
        }
      }

      // Ctrl/Cmd + N: Show horizontal bar for creating node
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        // Dispatch event to show horizontal bar
        const viewportCenter = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        window.dispatchEvent(new CustomEvent('show-create-toolbar', { detail: viewportCenter }));
        // Store center position as flow position
        (window as any).lastFlowPosition = { x: 500, y: 400 };
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

    window.addEventListener('deleteSelectedNode', handleDeleteNode as EventListener);
    return () => window.removeEventListener('deleteSelectedNode', handleDeleteNode as EventListener);
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
        {/* Left Sidebar - Nodes List (Collapsible) */}
        <CanvasSidebar workspaceId={workspaceId} />
        
        {/* Canvas Area */}
        <div className="flex-1 min-w-0 min-h-0 relative">
          <CanvasContainer 
            workspaceId={workspaceId} 
            onCreateNode={(pos) => {
              // Store click position for horizontal bar
              (window as any).lastClickPosition = pos;
              // Dispatch event to show horizontal bar
              window.dispatchEvent(new CustomEvent('show-create-toolbar', { detail: pos }));
            }}
          />
          
          {/* Floating Horizontal Bar */}
          <FloatingHorizontalBar
            onCreateNode={handleCreateNode}
            onDeleteNode={(nodeId) => {
              window.dispatchEvent(new CustomEvent('deleteSelectedNode', { detail: { nodeId } }));
            }}
            onDuplicateNode={handleDuplicateNode}
          />
        </div>
        
        {/* Right Panel - Node Editor or Toolbar Settings - Only show when node is selected or creating */}
        {selectedNodeId || selectedNodeType ? (
          <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col">
            {selectedNodeType && !selectedNodeId ? (
              <ToolbarSettingsPanel 
                selectedNodeType={selectedNodeType}
                onClose={() => setSelectedNodeType(null)}
              />
            ) : selectedNodeId ? (
              <NodeEditorPanel />
            ) : null}
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
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}
