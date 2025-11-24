'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical, Paintbrush, Eraser, Video, Globe, Globe2, Monitor, Plus, Square, StickyNote, Type, Workflow, GitBranch, Users, Sparkles, Circle, Triangle, RectangleHorizontal, FileText, Code, Image, Frame, Layers, Smile, PenTool, BarChart3, Grid3x3, Network, GitBranch as GitBranchIcon, Calendar, Map, Building2, List, Zap, Clock, Vote, Presentation, Eye, AlignLeft, Upload, Wand2, ChevronDown, MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface VerticalToolbarProps {
  // Tools will be added later
}

interface ToolItem {
  icon: LucideIcon;
  title: string;
  type: string;
  shapeType?: string;
}

interface ToolSectionProps {
  tools: ToolItem[];
  groupName: string;
}

const MARGIN_LEFT = 80; // Margin from left edge - increased to prevent touching canvas

// Tool Section Component with hover pop-out
const ToolSection = ({ tools, groupName }: ToolSectionProps) => {
  const [hovered, setHovered] = useState(false);
  const visibleTools = tools.slice(0, 4);
  const remainingTools = tools.slice(4);

  return (
    <div className="flex flex-col gap-1 w-full relative group/toolsection">
      {/* Visible Tools (first 4) */}
      {visibleTools.map((tool, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('create-tool-element', { 
              detail: { type: tool.type, shapeType: tool.shapeType } 
            }));
          }}
          className="p-1.5 rounded-lg transition-all duration-150 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/60"
          title={tool.title}
        >
          <tool.icon className="w-4 h-4" />
        </button>
      ))}
      
      {/* More Tools Button (if there are remaining tools) */}
      {remainingTools.length > 0 && (
        <div 
          className="relative"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            className="p-1.5 rounded-lg transition-all duration-150 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/60"
            title={`More ${groupName} tools`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {/* Hover Pop-out Menu - Vertical speech bubble style */}
          {hovered && (
            <div className="absolute left-full ml-2 top-0 z-50">
              {/* Speech bubble tail */}
              <div className="absolute left-0 top-2 -ml-1 w-2 h-2 bg-white/90 dark:bg-gray-800/90 border-l border-b border-gray-200/50 dark:border-gray-700/50 transform rotate-45" />
              
              {/* Pop-out menu */}
              <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl p-1.5 min-w-[44px]">
                {remainingTools.map((tool, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHovered(false);
                      window.dispatchEvent(new CustomEvent('create-tool-element', { 
                        detail: { type: tool.type, shapeType: tool.shapeType } 
                      }));
                    }}
                    className="w-full p-1.5 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/60 transition-colors mb-0.5 last:mb-0"
                    title={tool.title}
                  >
                    <tool.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VerticalToolbar = ({}: VerticalToolbarProps) => {
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);
  const [isCreationToolsActive, setIsCreationToolsActive] = useState(false);
  const [isDiagrammingToolsActive, setIsDiagrammingToolsActive] = useState(false);
  const [isFacilitationToolsActive, setIsFacilitationToolsActive] = useState(false);
  
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { x: MARGIN_LEFT, y: window.innerHeight / 2 };
    }
    return { x: MARGIN_LEFT, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Calculate initial position - left side, centered vertically, with offset from edges
  const getOriginalPosition = useCallback((): { x: number; y: number } => {
    if (typeof window === 'undefined') {
      return { x: MARGIN_LEFT, y: 0 };
    }
    
    // Position with margin from left edge of window, centered vertically
    return {
      x: MARGIN_LEFT,
      y: window.innerHeight / 2,
    };
  }, []);

  // Initialize position
  useEffect(() => {
    const timer = setTimeout(() => {
      setPosition(getOriginalPosition());
    }, 100);
    return () => clearTimeout(timer);
  }, [getOriginalPosition]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    }
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !toolbarRef.current) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    const rect = toolbarRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width / 2 - 24;
    const minX = rect.width / 2 + MARGIN_LEFT;
    const maxY = window.innerHeight - rect.height / 2 - 24;
    const minY = rect.height / 2 + 24;
    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Update position on resize
  useEffect(() => {
    const handleResize = () => {
      const original = getOriginalPosition();
      const threshold = 50;
      if (
        Math.abs(position.x - original.x) < threshold &&
        Math.abs(position.y - original.y) < threshold
      ) {
        setPosition(getOriginalPosition());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, getOriginalPosition]);

  // Handle brush toggle
  const handleBrushToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isBrushActive;
    setIsBrushActive(newState);
    
    // If activating brush, deactivate other tools
    if (newState) {
      setIsEraserActive(false);
      setIsCreationToolsActive(false);
      setIsDiagrammingToolsActive(false);
      setIsFacilitationToolsActive(false);
      window.dispatchEvent(new CustomEvent('toggle-eraser-mode', { 
        detail: { enabled: false } 
      }));
      window.dispatchEvent(new CustomEvent('toggle-creation-tools', { 
        detail: { enabled: false } 
      }));
      window.dispatchEvent(new CustomEvent('toggle-diagramming-tools', { 
        detail: { enabled: false } 
      }));
      window.dispatchEvent(new CustomEvent('toggle-facilitation-tools', { 
        detail: { enabled: false } 
      }));
    }
    
    // Dispatch event to enable/disable drawing mode
    window.dispatchEvent(new CustomEvent('toggle-drawing-mode', { 
      detail: { enabled: newState } 
    }));
    
    // Update cursor
    if (newState) {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = '';
    }
  }, [isBrushActive]);

  // Handle eraser toggle
  const handleEraserToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isEraserActive;
    setIsEraserActive(newState);
    
    // If activating eraser, deactivate other tools
    if (newState) {
      setIsBrushActive(false);
      setIsCreationToolsActive(false);
      setIsDiagrammingToolsActive(false);
      setIsFacilitationToolsActive(false);
      window.dispatchEvent(new CustomEvent('toggle-drawing-mode', { 
        detail: { enabled: false } 
      }));
      window.dispatchEvent(new CustomEvent('toggle-creation-tools', { 
        detail: { enabled: false } 
      }));
      window.dispatchEvent(new CustomEvent('toggle-diagramming-tools', { 
        detail: { enabled: false } 
      }));
      window.dispatchEvent(new CustomEvent('toggle-facilitation-tools', { 
        detail: { enabled: false } 
      }));
    }
    
    // Dispatch event to enable/disable eraser mode
    window.dispatchEvent(new CustomEvent('toggle-eraser-mode', { 
      detail: { enabled: newState } 
    }));
    
    // Update cursor
    if (newState) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = '';
    }
  }, [isEraserActive]);

  // Define tool groups
  const essentialTools: ToolItem[] = [
    { icon: Square, title: 'Shapes', type: 'shape', shapeType: 'rectangle' },
    { icon: Type, title: 'Text', type: 'text' },
    { icon: StickyNote, title: 'Sticky Notes', type: 'sticky-note' },
    { icon: GitBranch, title: 'Connection Lines', type: 'connection-line' },
    { icon: PenTool, title: 'Pen', type: 'pen' },
    { icon: Frame, title: 'Frames', type: 'frame' },
    { icon: FileText, title: 'Cards', type: 'card' },
    { icon: BarChart3, title: 'Charts', type: 'chart' },
    { icon: Code, title: 'Code Block', type: 'code-block' },
    { icon: Image, title: 'Images and Icons', type: 'image' },
    { icon: Smile, title: 'Stickers and Emojis', type: 'sticker' },
    { icon: FileText, title: 'Visual Notes', type: 'visual-note' },
  ];

  const diagrammingTools: ToolItem[] = [
    { icon: Network, title: 'Mind Map', type: 'mind-map' },
    { icon: Building2, title: 'Org Chart', type: 'org-chart' },
    { icon: Calendar, title: 'Timeline Builder', type: 'timeline' },
    { icon: Map, title: 'User Story Mapping', type: 'user-story-map' },
    { icon: Grid3x3, title: 'Grid', type: 'grid' },
    { icon: List, title: 'Columns (Kanban)', type: 'kanban' },
    { icon: Frame, title: 'Wireframe Library', type: 'wireframe' },
  ];

  const facilitationTools: ToolItem[] = [
    { icon: Clock, title: 'Timer', type: 'timer' },
    { icon: Vote, title: 'Voting', type: 'voting' },
    { icon: Sparkles, title: 'AI Clustering', type: 'ai-cluster' },
    { icon: Presentation, title: 'Presentation Mode', type: 'presentation-mode' },
    { icon: Eye, title: 'Attention Management', type: 'attention-management' },
  ];

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Glassmorphic vertical toolbar */}
      <div
        className="group relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/20 px-2 py-2 flex flex-col items-center gap-1.5 transition-all duration-200 hover:shadow-3xl hover:shadow-black/15 max-h-[85vh] overflow-y-auto overflow-x-hidden pb-4"
        onMouseDown={handleDragStart}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          minWidth: '44px',
          maxWidth: '44px',
        }}
      >
        {/* Drag handle - subtle dots - smaller */}
        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors opacity-40 group-hover:opacity-100 pb-1">
          <div className="flex flex-col gap-0.5">
            <div className="w-0.5 h-0.5 rounded-full bg-current" />
            <div className="w-0.5 h-0.5 rounded-full bg-current" />
            <div className="w-0.5 h-0.5 rounded-full bg-current" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

        {/* Drawing Tools Section - No label, just tools */}
        <div className="flex flex-col gap-1 w-full">
          {/* Brush Tool */}
          <button
            onClick={handleBrushToggle}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              isBrushActive
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
            }`}
            title={isBrushActive ? 'Disable brush tool' : 'Enable brush tool'}
          >
            <Paintbrush className="w-4 h-4" />
          </button>

          {/* Eraser Tool */}
          <button
            onClick={handleEraserToggle}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              isEraserActive
                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
            }`}
            title={isEraserActive ? 'Disable eraser tool' : 'Enable eraser tool'}
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent my-1" />

        {/* Essential Tools Section */}
        <ToolSection tools={essentialTools} groupName="Essential" />

        {/* Divider */}
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent my-1" />

        {/* Diagramming Tools Section */}
        <ToolSection tools={diagrammingTools} groupName="Diagramming" />

        {/* Divider */}
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent my-1" />

        {/* Facilitation & AI Tools Section */}
        <ToolSection tools={facilitationTools} groupName="Facilitation" />

        {/* Divider */}
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent my-1" />

        {/* Widgets Section - Side Pop-out */}
        <div className="flex flex-col gap-1 w-full relative group/widgets">
          {/* Main Widget Icon - Web App (iframe) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('create-widget', { 
                detail: { type: 'iframe-widget' } 
              }));
            }}
            className="p-1.5 rounded-lg transition-all duration-150 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/60"
            title="Web App (iframe)"
          >
            <Globe className="w-4 h-4" />
          </button>
          
          {/* Widgets Side Pop-out Menu - Other Options */}
          <div className="absolute left-full ml-2 top-0 opacity-0 invisible group-hover/widgets:opacity-100 group-hover/widgets:visible transition-all duration-200 z-50 pointer-events-none group-hover/widgets:pointer-events-auto">
            <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl p-1.5 min-w-[180px]">
              <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">
                More Widgets
              </div>
              {/* Web App (webview) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('create-widget', { 
                    detail: { type: 'webview-widget' } 
                  }));
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/60 transition-colors text-left"
              >
                <Globe2 className="w-3.5 h-3.5 text-green-500" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Web App (webview)</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Bypass CORS</div>
                </div>
              </button>
              {/* Live Capture */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('create-widget', { 
                    detail: { type: 'live-capture-widget' } 
                  }));
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/60 transition-colors text-left"
              >
                <Video className="w-3.5 h-3.5 text-purple-500" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Live Capture</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Screen capture</div>
                </div>
              </button>
              {/* Native App */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('create-widget', { 
                    detail: { type: 'native-window-widget' } 
                  }));
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/60 transition-colors text-left"
              >
                <Monitor className="w-3.5 h-3.5 text-orange-500" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Native App</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Embed desktop app</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Subtle glow effect */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-500/0 via-purple-500/0 to-blue-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"
          style={{ transform: 'scale(1.1)' }}
        />
      </div>
    </div>
  );
};

export default VerticalToolbar;
