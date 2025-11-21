'use client';

import { useCallback, useState, useEffect } from 'react';
import CanvasContainer from './CanvasContainer';
import NodeEditorPanel from './NodeEditorPanel';
import FloatingToolbar from './FloatingToolbar';
import KeyboardShortcuts from './KeyboardShortcuts';
import NodesListView from './NodesListView';
import ToolbarSettingsPanel from './ToolbarSettingsPanel';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';

interface CanvasPageClientProps {
  workspaceId: string;
}

export default function CanvasPageClient({ workspaceId }: CanvasPageClientProps) {
  const { nodes, addNode } = useWorkspaceStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const [isCreating, setIsCreating] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);

  const handleCreateNode = useCallback(
    async (type: string = 'note', screenPosition: { x: number; y: number }) => {
      console.log('handleCreateNode called with type:', type, 'position:', screenPosition);
      if (isCreating) {
        console.log('Already creating node, skipping');
        return;
      }
      
      setIsCreating(true);
      setToolbarPosition(null); // Hide toolbar

      try {
        const titles: Record<string, string> = {
          text: 'Text Block',
          note: 'New Note',
          link: 'New Link',
          image: 'New Image',
          box: 'New Box',
          circle: 'New Circle',
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
              : (type.includes('chart') ? getDefaultChartContent(type) : {}),
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
          console.error('Error creating node:', data.error);
          alert(`Failed to create node: ${data.error || 'Unknown error'}`);
          setSelectedNodeType(null);
          setIsCreating(false);
          return;
        }

        if (data.node) {
          console.log('[CanvasPageClient] Node created successfully:', data.node);
          
          // Add node to store immediately for instant UI update
          // This will trigger CanvasContainer's sync effect to update React Flow
          addNode(data.node);
          
          // Clear stored flow position since we've used it
          (window as any).lastFlowPosition = null;
          (window as any).lastScreenPosition = null;
          
          // Trigger workspace refresh to sync with backend (updates ListView and ClustersView)
          // Use a small delay to ensure immediate store update happens first
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          }, 100);
          
          // Select the new node immediately so it appears selected on canvas
          setTimeout(() => {
            selectNode(data.node.id);
            
            // Clear toolbar selection after node is selected
            setSelectedNodeType(null);
            
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
      } catch (error) {
        console.error('Error creating node:', error);
      } finally {
        setIsCreating(false);
      }
    },
    [workspaceId, isCreating, addNode, selectNode]
  );

  const handleShowToolbar = useCallback((position: { x: number; y: number }) => {
    console.log('handleShowToolbar called with position:', position);
    setToolbarPosition(position);
  }, []);

  const handleHideToolbar = useCallback(() => {
    setToolbarPosition(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          // Create node at center of viewport
          const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          };
          handleShowToolbar(viewportCenter);
          // Store center position as flow position
          (window as any).lastFlowPosition = { x: 500, y: 400 };
        }
        return;
      }

      // Ctrl/Cmd + N: Create new node
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        // Create node at center of viewport
        const viewportCenter = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        handleShowToolbar(viewportCenter);
        // Store center position as flow position
        (window as any).lastFlowPosition = { x: 500, y: 400 };
      }

      // Delete/Backspace: Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        // Dispatch delete event
        window.dispatchEvent(new CustomEvent('deleteSelectedNode', { detail: { nodeId: selectedNodeId } }));
      }

      // Escape: Deselect node, close toolbar, and close settings panel
      if (e.key === 'Escape') {
        selectNode(null);
        setToolbarPosition(null);
        setSelectedNodeType(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNode, selectedNodeId, handleShowToolbar]);

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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Main Canvas Area - must fill available space */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 relative">
          <CanvasContainer 
            workspaceId={workspaceId} 
            onCreateNode={(pos) => handleShowToolbar(pos)}
          />
          {toolbarPosition && (
            <>
              <div 
                className="fixed inset-0 z-[99998] bg-black/10"
                onClick={() => {
                  console.log('Backdrop clicked - closing toolbar');
                  handleHideToolbar();
                }}
              />
              <FloatingToolbar
                position={toolbarPosition}
              onClose={() => {
                console.log('FloatingToolbar onClose called');
                handleHideToolbar();
                setSelectedNodeType(null);
              }}
              onCreateNode={async (type, pos) => {
                console.log('[CanvasPageClient] FloatingToolbar onCreateNode called with type:', type, 'screen pos:', pos);
                try {
                  // Close toolbar immediately so user sees action happening
                  handleHideToolbar();
                  
                  // Show settings panel for this node type BEFORE creating
                  setSelectedNodeType(type);
                  
                  // Create the node - this will use the flow position stored during double-click
                  await handleCreateNode(type, pos);
                } catch (error) {
                  console.error('[CanvasPageClient] Error in onCreateNode:', error);
                  setSelectedNodeType(null);
                  setIsCreating(false);
                }
              }}
              />
            </>
          )}
        </div>
        
        {/* Right Panel - Node Editor or Toolbar Settings - fixed width */}
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col">
          {selectedNodeType && !selectedNodeId ? (
            <ToolbarSettingsPanel 
              selectedNodeType={selectedNodeType}
              onClose={() => setSelectedNodeType(null)}
            />
          ) : (
            <NodeEditorPanel />
          )}
        </aside>
      </div>
      
      {/* Nodes List View - below canvas */}
      <div className="h-64 shrink-0 border-t border-gray-200 overflow-hidden">
        <NodesListView workspaceId={workspaceId} />
      </div>
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}
