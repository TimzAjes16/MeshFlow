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
      // Don't set selectedNodeType here - wait until node is successfully created
      // This prevents the settings panel from showing if the API call fails

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
                  
                  // DON'T show settings panel yet - wait until node is successfully created
                  // This prevents settings panel from showing if API call fails
                  
                  // Create the node - this will use the flow position stored during double-click
                  await handleCreateNode(type, pos);
                  
                  // Settings panel will be shown in handleCreateNode after successful API response
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
      
      {/* Nodes List View - below canvas - only show if nodes exist */}
      {nodes.length > 0 && (
        <div className="h-64 shrink-0 border-t border-gray-200 overflow-hidden">
          <NodesListView workspaceId={workspaceId} />
        </div>
      )}
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}
