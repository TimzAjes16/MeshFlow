'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Undo2, Redo2, Palette, Minus, Plus, Eraser, CircleDot, Trash2, Video, RefreshCw, Crop, MousePointerClick, MousePointer2, X, Globe, Globe2, Monitor, Save, Square, Type, Bold, Italic, Copy, Workflow, GitBranch, ArrowRight, Layers, Layout, Users, Clock, Vote, Sparkles, Presentation, Eye, AlignLeft, AlignCenter, AlignRight, Code, Image as ImageIcon, Underline, WrapText } from 'lucide-react';
import FloatingCropArea from './FloatingCropArea';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import type { Node } from '@/types/Node';
import { getNodeType } from '@/lib/nodeTypes';

interface HorizontalEditorBarProps {
  selectedNodeId?: string | null;
  // Editing options will be added later
}

const MARGIN_BOTTOM = 48; // Margin from bottom edge

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans Pro',
  'Noto Sans', 'Raleway', 'Work Sans', 'Nunito', 'Mukta', 'Playfair Display', 'Merriweather',
  'Fira Sans', 'PT Sans', 'PT Serif', 'Rubik', 'Karla', 'Quicksand', 'Manrope', 'Hind',
  'Space Grotesk', 'IBM Plex Sans', 'Archivo', 'Cabin'
];

const DEFAULT_TEXT_CONTENT = {
  type: 'text',
  value: 'Tap to type',
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 'normal' as 'normal' | 'bold',
  color: '#111827',
  textAlign: 'left' as 'left' | 'center' | 'right',
  isItalic: false,
  isUnderline: false,
  textWrap: true,
};

type TextContentSettings = typeof DEFAULT_TEXT_CONTENT;

const extractLegacyDocValue = (node: any): string => {
  if (!node) return '';
  if (Array.isArray(node)) {
    return node.map(extractLegacyDocValue).join('');
  }
  if (typeof node === 'object') {
    if (typeof node.text === 'string') {
      return node.text;
    }
    if (Array.isArray(node.content)) {
      return node.content.map(extractLegacyDocValue).join('');
    }
  }
  return '';
};

const HorizontalEditorBar = ({ selectedNodeId }: HorizontalEditorBarProps) => {
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);
  const [isLiveCaptureActive, setIsLiveCaptureActive] = useState(false);
  const [isCreationToolsActive, setIsCreationToolsActive] = useState(false);
  const [isDiagrammingToolsActive, setIsDiagrammingToolsActive] = useState(false);
  const [isFacilitationToolsActive, setIsFacilitationToolsActive] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [eraserType, setEraserType] = useState<'partial' | 'full'>('partial');
  const [eraserSize, setEraserSize] = useState(10);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEraserTypeMenu, setShowEraserTypeMenu] = useState(false);
  const [showFloatingCropArea, setShowFloatingCropArea] = useState(false);
  
  // Creation tools state
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);
  const [showStrokeColorPicker, setShowStrokeColorPicker] = useState(false);
  
  // Diagramming tools state
  const [smartSnap, setSmartSnap] = useState(true);
  const [arrowheadStyle, setArrowheadStyle] = useState<'arrow' | 'diamond' | 'circle'>('arrow');
  const [showArrowheadMenu, setShowArrowheadMenu] = useState(false);
  
  // Facilitation tools state
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minutes default
  const [presentationMode, setPresentationMode] = useState(false);
  
  // Text tool state
  const [fontFamily, setFontFamily] = useState(DEFAULT_TEXT_CONTENT.fontFamily);
  const [fontSize, setFontSize] = useState(DEFAULT_TEXT_CONTENT.fontSize);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>(DEFAULT_TEXT_CONTENT.fontWeight);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(DEFAULT_TEXT_CONTENT.textAlign);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_CONTENT.color);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textWrap, setTextWrap] = useState(true);
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  
  // Code block tool state
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  
  // Image tool state
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('center');
  
  // Note/Sticky Note tool state
  const [noteColor, setNoteColor] = useState('#FFEB3B');
  
  // Widget configuration state
  const [widgetUrl, setWidgetUrl] = useState('');
  const [widgetProcessName, setWidgetProcessName] = useState('');
  const [widgetWindowTitle, setWidgetWindowTitle] = useState('');
  
  const { nodes, updateNode: updateWorkspaceNode } = useWorkspaceStore();
  const { selectNode } = useCanvasStore();
  
  // Get selected node if available
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  
  // Get node type using the proper function
  const nodeType = selectedNode ? getNodeType(selectedNode) : null;
  
  // Check node types
  const isLiveCaptureNode = nodeType === 'live-capture' || nodeType === 'live-capture-widget';
  const isShapeNode = nodeType === 'box' || nodeType === 'circle';
  const isConnectionNode = nodeType === 'arrow';
  const isTextNode = nodeType === 'text';
  const isTimerNode = nodeType === 'timer';
  const isVotingNode = nodeType === 'voting';
  const isCodeBlockNode = nodeType === 'code-block';
  const isImageNode = nodeType === 'image';
  const isNoteNode = nodeType === 'note';
  const isStickyNoteNode = selectedNode && typeof selectedNode.content === 'object' && 
    ('color' in selectedNode.content || selectedNode.content?.type === 'sticky-note');
  
  // Check widget types
  const isIframeWidget = nodeType === 'iframe-widget';
  const isWebViewWidget = nodeType === 'webview-widget';
  const isNativeWindowWidget = nodeType === 'native-window-widget';

  const getCurrentTextContent = useCallback((): TextContentSettings => {
    if (selectedNode && typeof selectedNode.content === 'object') {
      if (selectedNode.content.type === 'text') {
        return { ...DEFAULT_TEXT_CONTENT, ...(selectedNode.content as Partial<TextContentSettings>) };
      }
      if (selectedNode.content.type === 'doc') {
        return {
          ...DEFAULT_TEXT_CONTENT,
          value: extractLegacyDocValue(selectedNode.content),
        };
      }
    }
    return { ...DEFAULT_TEXT_CONTENT };
  }, [selectedNode]);

  const updateTextNodeContent = useCallback((updates: Record<string, any>) => {
    if (!selectedNodeId || !isTextNode) return;
    const base = getCurrentTextContent();
    updateWorkspaceNode(selectedNodeId, {
      content: {
        ...base,
        ...updates,
      },
    });
  }, [selectedNodeId, isTextNode, getCurrentTextContent, updateWorkspaceNode]);

  // Initialize widget URL from selected node content
  useEffect(() => {
    if (selectedNode && (isIframeWidget || isWebViewWidget)) {
      const content = typeof selectedNode.content === 'object' && selectedNode.content
        ? selectedNode.content as any
        : null;
      const url = content?.url || '';
      setWidgetUrl(url);
    } else if (!selectedNode || (!isIframeWidget && !isWebViewWidget)) {
      setWidgetUrl('');
    }
  }, [selectedNodeId, isIframeWidget, isWebViewWidget, selectedNode]);

  // Initialize text tool settings from selected node
  useEffect(() => {
    if (selectedNode && isTextNode) {
      const content = getCurrentTextContent();
      setFontFamily(content.fontFamily);
      setFontSize(content.fontSize);
      setFontWeight(content.fontWeight);
      setIsItalic(content.isItalic);
      setIsUnderline(content.isUnderline);
      setTextWrap(content.textWrap);
      setTextAlign(content.textAlign);
      setTextColor(content.color);
    } else if (!selectedNode || !isTextNode) {
      setFontFamily(DEFAULT_TEXT_CONTENT.fontFamily);
      setFontSize(DEFAULT_TEXT_CONTENT.fontSize);
      setFontWeight(DEFAULT_TEXT_CONTENT.fontWeight);
      setIsItalic(DEFAULT_TEXT_CONTENT.isItalic);
      setIsUnderline(DEFAULT_TEXT_CONTENT.isUnderline);
      setTextWrap(DEFAULT_TEXT_CONTENT.textWrap);
      setTextAlign(DEFAULT_TEXT_CONTENT.textAlign);
      setTextColor(DEFAULT_TEXT_CONTENT.color);
    }
  }, [selectedNodeId, isTextNode, selectedNode, getCurrentTextContent]);

  // Initialize shape tool settings from selected node
  useEffect(() => {
    if (selectedNode && isShapeNode) {
      const content = typeof selectedNode.content === 'object' && selectedNode.content
        ? selectedNode.content as any
        : {};
      if (content.fillColor) setFillColor(content.fillColor);
      else setFillColor('#FFFFFF');
      if (content.borderColor) setStrokeColor(content.borderColor);
      else setStrokeColor('#000000');
    } else if (!selectedNode || !isShapeNode) {
      setFillColor('#FFFFFF');
      setStrokeColor('#000000');
    }
  }, [selectedNodeId, isShapeNode, selectedNode]);

  // Initialize code block settings from selected node
  useEffect(() => {
    if (selectedNode && isCodeBlockNode) {
      const content = typeof selectedNode.content === 'object' && selectedNode.content
        ? selectedNode.content as any
        : {};
      if (content.language) setCodeLanguage(content.language);
      else setCodeLanguage('javascript');
    } else if (!selectedNode || !isCodeBlockNode) {
      setCodeLanguage('javascript');
    }
  }, [selectedNodeId, isCodeBlockNode, selectedNode]);

  // Initialize image settings from selected node
  useEffect(() => {
    if (selectedNode && isImageNode) {
      const content = typeof selectedNode.content === 'object' && selectedNode.content
        ? selectedNode.content as any
        : {};
      if (content.size) setImageSize(content.size);
      else setImageSize('medium');
      if (content.alignment) setImageAlign(content.alignment);
      else setImageAlign('center');
    } else if (!selectedNode || !isImageNode) {
      setImageSize('medium');
      setImageAlign('center');
    }
  }, [selectedNodeId, isImageNode, selectedNode]);

  // Initialize note color from selected node
  useEffect(() => {
    if (selectedNode && (isNoteNode || isStickyNoteNode)) {
      const content = typeof selectedNode.content === 'object' && selectedNode.content
        ? selectedNode.content as any
        : {};
      if (content.color) setNoteColor(content.color);
      else setNoteColor('#FFEB3B');
    } else if (!selectedNode || (!isNoteNode && !isStickyNoteNode)) {
      setNoteColor('#FFEB3B');
    }
  }, [selectedNodeId, isNoteNode, isStickyNoteNode, selectedNode]);

  // Listen for text tool activation
  useEffect(() => {
    const handleToggleTextTool = (event: CustomEvent<{ enabled: boolean }>) => {
      setIsTextToolActive(event.detail.enabled);
    };

    window.addEventListener('toggle-text-tool', handleToggleTextTool as EventListener);
    return () => window.removeEventListener('toggle-text-tool', handleToggleTextTool as EventListener);
  }, []);
  
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth / 2, y: window.innerHeight - MARGIN_BOTTOM };
    }
    return { x: 0, y: MARGIN_BOTTOM };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // Preload Google fonts used in the text tool
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const linkId = 'horizontal-text-tool-fonts';
    if (document.getElementById(linkId)) return;
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    const familyQuery = GOOGLE_FONTS.map((font) => `family=${font.replace(/\s+/g, '+')}:wght@400;500;600;700`).join('&');
    link.href = `https://fonts.googleapis.com/css2?${familyQuery}&display=swap`;
    document.head.appendChild(link);
  }, []);

  // Calculate initial position - bottom center, with offset from edges
  const getOriginalPosition = useCallback((): { x: number; y: number } => {
    if (typeof window === 'undefined') {
      return { x: 0, y: MARGIN_BOTTOM };
    }
    
    // Position centered horizontally on window, with margin from bottom
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight - MARGIN_BOTTOM,
    };
  }, []);

  // Initialize position
  useEffect(() => {
    const timer = setTimeout(() => {
      setPosition(getOriginalPosition());
    }, 100);
    return () => clearTimeout(timer);
  }, [getOriginalPosition]);

  // Reset position when selection changes - only run when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      const original = getOriginalPosition();
      setPosition((currentPosition) => {
      const threshold = 50;
        // Only reset if close to original position
      if (
          Math.abs(currentPosition.x - original.x) < threshold &&
          Math.abs(currentPosition.y - original.y) < threshold
      ) {
          return original;
      }
        return currentPosition;
      });
    }
  }, [selectedNodeId, getOriginalPosition]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const interactiveSelector = 'button,select,input,textarea,option,[role="menu"],[role="listbox"]';
    if (target.closest(interactiveSelector)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    }
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !barRef.current) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    const rect = barRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width / 2 - 24;
    const minX = rect.width / 2 + 24;
    const maxY = window.innerHeight - rect.height / 2 - MARGIN_BOTTOM;
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
      setPosition((currentPosition) => {
      const threshold = 50;
        // Only reset if close to original position
      if (
          Math.abs(currentPosition.x - original.x) < threshold &&
          Math.abs(currentPosition.y - original.y) < threshold
      ) {
          return original;
      }
        return currentPosition;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getOriginalPosition]);

  // Listen for brush tool activation
  useEffect(() => {
    const handleToggleDrawing = (event: CustomEvent) => {
      setIsBrushActive(event.detail.enabled);
    };

    window.addEventListener('toggle-drawing-mode', handleToggleDrawing as EventListener);
    return () => {
      window.removeEventListener('toggle-drawing-mode', handleToggleDrawing as EventListener);
    };
  }, []);

  // Listen for eraser tool activation
  useEffect(() => {
    const handleToggleEraser = (event: CustomEvent) => {
      setIsEraserActive(event.detail.enabled);
    };

    window.addEventListener('toggle-eraser-mode', handleToggleEraser as EventListener);
    return () => {
      window.removeEventListener('toggle-eraser-mode', handleToggleEraser as EventListener);
    };
  }, []);

  // Listen for live capture tool activation (kept for potential future use, but Capture button doesn't depend on it)
  useEffect(() => {
    const handleToggleLiveCapture = (event: CustomEvent) => {
      setIsLiveCaptureActive(event.detail.enabled);
    };

    window.addEventListener('toggle-live-capture-mode', handleToggleLiveCapture as EventListener);
    return () => {
      window.removeEventListener('toggle-live-capture-mode', handleToggleLiveCapture as EventListener);
    };
  }, []);

  // Listen for creation tools activation
  useEffect(() => {
    const handleToggleCreationTools = (event: CustomEvent) => {
      setIsCreationToolsActive(event.detail.enabled);
    };

    window.addEventListener('toggle-creation-tools', handleToggleCreationTools as EventListener);
    return () => {
      window.removeEventListener('toggle-creation-tools', handleToggleCreationTools as EventListener);
    };
  }, []);

  // Listen for diagramming tools activation
  useEffect(() => {
    const handleToggleDiagrammingTools = (event: CustomEvent) => {
      setIsDiagrammingToolsActive(event.detail.enabled);
    };

    window.addEventListener('toggle-diagramming-tools', handleToggleDiagrammingTools as EventListener);
    return () => {
      window.removeEventListener('toggle-diagramming-tools', handleToggleDiagrammingTools as EventListener);
    };
  }, []);

  // Listen for facilitation tools activation
  useEffect(() => {
    const handleToggleFacilitationTools = (event: CustomEvent) => {
      setIsFacilitationToolsActive(event.detail.enabled);
    };

    window.addEventListener('toggle-facilitation-tools', handleToggleFacilitationTools as EventListener);
    return () => {
      window.removeEventListener('toggle-facilitation-tools', handleToggleFacilitationTools as EventListener);
    };
  }, []);

  // Listen for drawing settings changes
  useEffect(() => {
    if (isBrushActive) {
      window.dispatchEvent(new CustomEvent('update-drawing-settings', {
        detail: { color: brushColor, strokeWidth: brushSize }
      }));
    }
  }, [brushColor, brushSize, isBrushActive]);

  // Listen for eraser settings changes
  useEffect(() => {
    if (isEraserActive) {
      window.dispatchEvent(new CustomEvent('update-eraser-settings', {
        detail: { eraserType, eraserSize }
      }));
    }
  }, [eraserType, eraserSize, isEraserActive]);

  // Handle undo
  const handleUndo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('drawing-undo'));
  }, []);

  // Handle redo
  const handleRedo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('drawing-redo'));
  }, []);

  // Handle color change
  const handleColorChange = useCallback((color: string) => {
    setBrushColor(color);
    setShowColorPicker(false);
  }, []);

  // Handle brush size change
  const handleSizeChange = useCallback((delta: number) => {
    setBrushSize((prev) => Math.max(1, Math.min(20, prev + delta)));
  }, []);

  // Handle eraser size change
  const handleEraserSizeChange = useCallback((delta: number) => {
    setEraserSize((prev) => Math.max(1, Math.min(50, prev + delta)));
  }, []);

  // Handle eraser type change
  const handleEraserTypeChange = useCallback((type: 'partial' | 'full') => {
    setEraserType(type);
    setShowEraserTypeMenu(false);
  }, []);

  // Predefined colors
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ];

  // Handle Update Source - re-open capture modal for existing node
  const handleUpdateSource = useCallback(() => {
    if (!selectedNodeId || !isLiveCaptureNode) return;
    window.dispatchEvent(new CustomEvent('open-live-capture-modal', {
      detail: { nodeId: selectedNodeId }
    }));
  }, [selectedNodeId, isLiveCaptureNode]);

  // Handle Recrop/Edit Viewport - open crop editor
  const handleRecrop = useCallback(() => {
    if (!selectedNodeId || !isLiveCaptureNode) return;
    window.dispatchEvent(new CustomEvent('recrop-live-capture', {
      detail: { nodeId: selectedNodeId }
    }));
  }, [selectedNodeId, isLiveCaptureNode]);

  // Handle Interaction Toggle - enable/disable interaction with captured content
  const handleToggleInteraction = useCallback(async () => {
    if (!selectedNodeId || !isLiveCaptureNode || !selectedNode) return;
    
    const currentContent = typeof selectedNode.content === 'object' && selectedNode.content?.type === 'live-capture'
      ? selectedNode.content
      : { type: 'live-capture', imageUrl: '', cropArea: { x: 0, y: 0, width: 0, height: 0 }, captureHistory: [] };
    
    const newInteractive = !(currentContent.interactive ?? false);
    
    const updatedContent = {
      ...currentContent,
      type: 'live-capture',
      interactive: newInteractive,
    };
    
    // Update node content
    updateWorkspaceNode(selectedNodeId, {
      content: updatedContent,
    });
    
    // Persist to API
    try {
      const response = await fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selectedNodeId,
          content: updatedContent,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          updateWorkspaceNode(selectedNodeId, data.node);
        }
      }
    } catch (error) {
      console.error('Error toggling interaction:', error);
    }
  }, [selectedNodeId, isLiveCaptureNode, selectedNode, updateWorkspaceNode]);

  // Handle crop area confirmation (used by both React component and Electron overlay)
  // Use a ref to track if we're already handling a crop area confirmation
  const isHandlingCropAreaConfirmRef = useRef(false);
  
  const handleCropAreaConfirm = useCallback(async (area: { x: number; y: number; width: number; height: number }) => {
    // Prevent duplicate confirmations
    if (isHandlingCropAreaConfirmRef.current) {
      console.warn('[HorizontalEditorBar] Already handling crop area confirmation, ignoring duplicate');
      return;
    }
    
    console.log('[HorizontalEditorBar] handleCropAreaConfirm called with area:', area);
    isHandlingCropAreaConfirmRef.current = true;
    
    // Close the crop area overlay first to prevent focus issues
    setShowFloatingCropArea(false);
    
    // Close Electron overlay if it's open
    if (typeof window !== 'undefined' && (window as any).electronAPI?.closeCropAreaOverlay) {
      try {
        await (window as any).electronAPI.closeCropAreaOverlay();
      } catch (error) {
        console.warn('[HorizontalEditorBar] Error closing crop area overlay:', error);
      }
    }
    
    // Small delay to ensure overlay is closed before starting capture
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Start screen capture - user will select which screen/application contains the highlighted area
    // We capture the entire selected screen/window, then crop to show only the highlighted area
    try {
      const { getScreenCaptureStream, requestScreenRecordingPermission, checkScreenRecordingPermission } = await import('@/lib/electronUtils');
      console.log('[HorizontalEditorBar] Starting screen capture for area:', area);
      console.log('[HorizontalEditorBar] Note: Please select the screen/application that contains the highlighted area when prompted');
      
      // Check and request permissions before attempting capture
      const permissionStatus = await checkScreenRecordingPermission();
      console.log('[HorizontalEditorBar] Permission status:', permissionStatus);
      
      if (permissionStatus.granted === false || permissionStatus.granted === null) {
        console.log('[HorizontalEditorBar] Requesting screen recording permission...');
        const permissionResult = await requestScreenRecordingPermission();
        
        if (!permissionResult.granted) {
          const errorMessage = permissionResult.message || 'Screen recording permission is required to capture the screen.';
          console.error('[HorizontalEditorBar] Permission denied:', errorMessage);
          alert(errorMessage);
          return;
        }
        
        console.log('[HorizontalEditorBar] Screen recording permission granted:', permissionResult.message);
      }
      
      // Get screen capture stream - this will show a picker for user to select screen/window
      // IMPORTANT: User should select the screen/application that contains the highlighted area
      // Show alert to guide user on which window to select
      console.log('[HorizontalEditorBar] Getting screen capture stream...');
      
      // Show helpful message to guide user selection
      const userMessage = `When the screen capture picker appears, please:\n\n1. Look for the window/application that contains your highlighted area\n2. Select that specific window (e.g., Safari, if you highlighted an area in Safari)\n3. Do NOT select "Entire Screen" or the wrong application\n\nClick OK to show the picker.`;
      
      // Don't block with alert - just log for now
      console.log('[HorizontalEditorBar] User guidance:', userMessage);
      console.log('[HorizontalEditorBar] When the picker appears, select the screen/application that contains the highlighted area');
      
      const stream = await getScreenCaptureStream({ requestPermissions: true, includeAudio: false });
      
      // Verify stream has video tracks
      const tracks = stream.getVideoTracks();
      if (tracks.length === 0) {
        throw new Error('Screen capture stream has no video tracks');
      }
      
      // Get track settings to determine what was captured
      const trackSettings = tracks[0].getSettings();
      console.log('[HorizontalEditorBar] Screen capture stream obtained:', {
        streamId: stream.id,
        trackCount: tracks.length,
        readyStates: tracks.map(t => t.readyState),
        trackSettings: trackSettings,
        // Note: getSettings() may not always provide width/height, so we'll check video element later
      });
      
      // Store stream globally for immediate access
      (window as any).currentScreenStream = stream;
      
      // Dispatch event to create live capture node with the area and stream
      // The area coordinates are in absolute screen space
      // The video stream will be cropped to show only this area
      console.log('[HorizontalEditorBar] Dispatching create-live-capture-from-area event with area:', area);
      const event = new CustomEvent('create-live-capture-from-area', {
        detail: { 
          area: {
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
          },
          stream 
        }
      });
      window.dispatchEvent(event);
      console.log('[HorizontalEditorBar] Event dispatched successfully');
      
      // Reset flag after a delay to allow event to be processed
      setTimeout(() => {
        isHandlingCropAreaConfirmRef.current = false;
      }, 2000);
    } catch (error: any) {
      console.error('[HorizontalEditorBar] Error starting screen capture:', error);
      console.error('[HorizontalEditorBar] Error stack:', error.stack);
      isHandlingCropAreaConfirmRef.current = false;
      alert(`Failed to start screen capture: ${error.message || 'Unknown error'}. Please try again.`);
    }
  }, []);

  // Listen for crop area selection from Electron overlay
  // Note: This must be set up after handleCropAreaConfirm is defined
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).electronAPI?.onCropAreaSelected) {
      console.log('[HorizontalEditorBar] Electron API not available for crop area events');
      return;
    }

    console.log('[HorizontalEditorBar] Setting up crop area event listeners');
    
    const handleCropAreaSelected = (area: { x: number; y: number; width: number; height: number }) => {
      // Handle crop area selection from Electron overlay
      console.log('[HorizontalEditorBar] Crop area selected from Electron overlay:', area);
      handleCropAreaConfirm(area);
    };

    const handleCropAreaCancelled = () => {
      console.log('[HorizontalEditorBar] Crop area cancelled from Electron overlay');
      setShowFloatingCropArea(false);
      setIsLiveCaptureActive(false);
      window.dispatchEvent(new CustomEvent('toggle-live-capture-mode', { 
        detail: { enabled: false } 
      }));
    };

    (window as any).electronAPI.onCropAreaSelected(handleCropAreaSelected);
    (window as any).electronAPI.onCropAreaCancelled(handleCropAreaCancelled);
    
    console.log('[HorizontalEditorBar] Crop area event listeners registered');

    return () => {
      // Cleanup is handled by Electron's IPC system
      // Note: We can't easily remove IPC listeners, but they should be scoped to this component lifecycle
    };
  }, [handleCropAreaConfirm]);

  // Get interaction state
  const isInteractive = selectedNode && isLiveCaptureNode && 
    typeof selectedNode.content === 'object' && 
    selectedNode.content?.type === 'live-capture' &&
    (selectedNode.content.interactive ?? false);
  
  // Normalize URL - add protocol if missing
  const normalizeUrl = useCallback((url: string): string => {
    if (!url || !url.trim()) return '';
    
    const trimmedUrl = url.trim();
    
    // If it already has a protocol, return as is
    if (/^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl;
    }
    
    // Add https:// if no protocol
    return `https://${trimmedUrl}`;
  }, []);

  // Validate URL
  const isValidUrl = useCallback((url: string): boolean => {
    if (!url || !url.trim()) return false;
    
    try {
      const normalized = normalizeUrl(url);
      const urlObj = new URL(normalized);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }, [normalizeUrl]);

  // Handle widget URL save (for iframe and webview widgets)
  const handleSaveWidgetUrl = useCallback(async () => {
    if (!selectedNodeId || (!isIframeWidget && !isWebViewWidget)) return;
    
    // Validate URL
    if (!isValidUrl(widgetUrl)) {
      alert('Please enter a valid URL (e.g., https://example.com or example.com)');
      return;
    }
    
    // Normalize URL
    const normalizedUrl = normalizeUrl(widgetUrl);
    
    const currentContent = typeof selectedNode?.content === 'object' && selectedNode?.content
      ? selectedNode.content as any
      : { type: isIframeWidget ? 'iframe-widget' : 'webview-widget', url: '' };
    
    const updatedContent = {
      ...currentContent,
      type: isIframeWidget ? 'iframe-widget' : 'webview-widget',
      url: normalizedUrl,
    };
    
    // Update workspace store immediately for instant feedback
    updateWorkspaceNode(selectedNodeId, {
      content: updatedContent,
    });
    
    // Dispatch custom event to force immediate widget reload
    window.dispatchEvent(new CustomEvent('widget-url-updated', {
      detail: {
        nodeId: selectedNodeId,
        url: normalizedUrl,
        widgetType: isIframeWidget ? 'iframe-widget' : 'webview-widget',
      }
    }));
    
    // Persist to API
    try {
      const response = await fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selectedNodeId,
          content: updatedContent,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          updateWorkspaceNode(selectedNodeId, data.node);
        }
      } else {
        const errorText = await response.text().catch(() => response.statusText);
        console.error('Error updating widget URL:', errorText);
        alert(`Failed to save URL: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating widget URL:', error);
      alert(`Error saving URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedNodeId, isIframeWidget, isWebViewWidget, widgetUrl, selectedNode, updateWorkspaceNode, normalizeUrl, isValidUrl]);

  // Handle auto-save on blur
  const handleUrlBlur = useCallback(() => {
    // Auto-save on blur (when widget is deselected or input loses focus)
    if (widgetUrl && isValidUrl(widgetUrl)) {
      handleSaveWidgetUrl();
    }
  }, [widgetUrl, isValidUrl, handleSaveWidgetUrl]);
  
  // Handle native window widget save
  const handleSaveNativeWindowConfig = useCallback(async () => {
    if (!selectedNodeId || !isNativeWindowWidget) return;
    
    const currentContent = typeof selectedNode?.content === 'object' && selectedNode?.content
      ? selectedNode.content as any
      : { type: 'native-window-widget', processName: '', windowTitle: '' };
    
    const updatedContent = {
      ...currentContent,
      type: 'native-window-widget',
      processName: widgetProcessName,
      windowTitle: widgetWindowTitle,
    };
    
    updateWorkspaceNode(selectedNodeId, {
      content: updatedContent,
    });
    
    // Persist to API
    try {
      const response = await fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selectedNodeId,
          content: updatedContent,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          updateWorkspaceNode(selectedNodeId, data.node);
        }
      }
    } catch (error) {
      console.error('Error updating native window widget:', error);
    }
  }, [selectedNodeId, isNativeWindowWidget, widgetProcessName, widgetWindowTitle, selectedNode, updateWorkspaceNode]);

  // Show widget when any tool is active (brush, eraser, live capture) or when a node with specific settings is selected
  const shouldShow = isBrushActive || isEraserActive || isLiveCaptureActive || isTextToolActive ||
    selectedNodeId && (isTextNode || isShapeNode || isTimerNode || isVotingNode || isCodeBlockNode || isImageNode || isNoteNode || isStickyNoteNode || isConnectionNode || isLiveCaptureNode || isIframeWidget || isWebViewWidget || isNativeWindowWidget);
  
  if (!shouldShow) {
    return null;
  }

  return (
    <div
      ref={barRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        bottom: `${typeof window !== 'undefined' ? window.innerHeight - position.y : MARGIN_BOTTOM}px`,
        transform: 'translate(-50%, 0)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Glassmorphic horizontal editor bar */}
      <div
        className="group relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/20 px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:shadow-3xl hover:shadow-black/15"
        onMouseDown={handleDragStart}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {/* Drag handle - subtle dots */}
        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors opacity-40 group-hover:opacity-100">
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

        {/* Editing options will go here */}
        <div className="flex items-center gap-2 min-h-[32px] min-w-[200px] justify-center">
          {/* Eraser Tool Controls - Only show when eraser is active */}
          {isEraserActive && (
            <>
              {/* Undo/Redo */}
              <button
                onClick={handleUndo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/undo"
                title="Undo"
              >
                <Undo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/undo:text-gray-800 dark:group-hover/undo:text-gray-200 transition-colors" />
              </button>
              <button
                onClick={handleRedo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/redo"
                title="Redo"
              >
                <Redo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/redo:text-gray-800 dark:group-hover/redo:text-gray-200 transition-colors" />
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Erase Type Selector */}
              <div className="relative eraser-type-menu">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEraserTypeMenu(!showEraserTypeMenu);
                  }}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/type flex items-center gap-1"
                  title={`Erase type: ${eraserType === 'partial' ? 'Partial' : 'Full'}`}
                >
                  {eraserType === 'partial' ? (
                    <CircleDot className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/type:text-gray-800 dark:group-hover/type:text-gray-200 transition-colors" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/type:text-gray-800 dark:group-hover/type:text-gray-200 transition-colors" />
                  )}
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {eraserType === 'partial' ? 'Partial' : 'Full'}
                  </span>
                </button>
                
                {/* Erase Type Menu */}
                {showEraserTypeMenu && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50 min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEraserTypeChange('partial');
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        eraserType === 'partial'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <CircleDot className="w-4 h-4" />
                      <span className="text-sm">Partial</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEraserTypeChange('full');
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all mt-1 ${
                        eraserType === 'full'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Full</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Eraser Size Control */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <button
                  onClick={() => handleEraserSizeChange(-1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Decrease eraser size"
                >
                  <Minus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[24px] text-center">
                  {eraserSize}px
                </span>
                <button
                  onClick={() => handleEraserSizeChange(1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Increase eraser size"
                >
                  <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </>
          )}

          {/* Brush Tool Controls - Only show when brush is active */}
          {isBrushActive && (
            <>
              {/* Undo/Redo */}
              <button
                onClick={handleUndo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/undo"
                title="Undo"
              >
                <Undo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/undo:text-gray-800 dark:group-hover/undo:text-gray-200 transition-colors" />
              </button>
              <button
                onClick={handleRedo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/redo"
                title="Redo"
              >
                <Redo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/redo:text-gray-800 dark:group-hover/redo:text-gray-200 transition-colors" />
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/color"
                  title="Color"
                >
                  <Palette className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/color:text-gray-800 dark:group-hover/color:text-gray-200 transition-colors" />
                </button>
                
                {/* Color Picker Popup */}
                {showColorPicker && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50">
                    <div className="grid grid-cols-5 gap-2 w-[200px]">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            brushColor === color
                              ? 'border-gray-800 dark:border-gray-200 ring-2 ring-blue-500/50'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    {/* Custom Color Input */}
                    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-full h-8 rounded cursor-pointer"
                        title="Custom color"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Current Color Display */}
              <div
                className="w-6 h-6 rounded border border-gray-300/50 dark:border-gray-600/50"
                style={{ backgroundColor: brushColor }}
                title={`Color: ${brushColor}`}
              />

              {/* Brush Size Control */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <button
                  onClick={() => handleSizeChange(-1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Decrease size"
                >
                  <Minus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[20px] text-center">
                  {brushSize}px
                </span>
                <button
                  onClick={() => handleSizeChange(1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Increase size"
                >
                  <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </>
          )}

          {/* Live Capture Controls - Show ONLY when live capture tool is active, NOT when node is selected */}
          {isLiveCaptureActive && !isLiveCaptureNode && (
            <>
              {/* Divider if there are other controls before */}
              {(isBrushActive || isEraserActive) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}

              {/* Update Source Button */}
              <button
                onClick={handleUpdateSource}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/update flex items-center gap-1.5"
                title="Update Source - Change the captured source"
              >
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/update:text-purple-600 dark:group-hover/update:text-purple-400 transition-colors" />
                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover/update:text-purple-600 dark:group-hover/update:text-purple-400 transition-colors">
                  Update Source
                </span>
              </button>

              {/* Recrop/Edit Viewport Button */}
              <button
                onClick={handleRecrop}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/recrop flex items-center gap-1.5"
                title="Recrop - Edit the viewport/crop area"
              >
                <Crop className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/recrop:text-purple-600 dark:group-hover/recrop:text-purple-400 transition-colors" />
                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover/recrop:text-purple-600 dark:group-hover/recrop:text-purple-400 transition-colors">
                  Recrop
                </span>
              </button>

              {/* Interaction Toggle Button */}
              <button
                onClick={handleToggleInteraction}
                className={`p-1.5 rounded-lg transition-all duration-150 group/interact flex items-center gap-1.5 ${
                  isInteractive
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
                }`}
                title={isInteractive ? 'Disable Interaction - Make captured content non-interactive' : 'Enable Interaction - Allow interaction with captured content'}
              >
                {isInteractive ? (
                  <MousePointerClick className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                ) : (
                  <MousePointer2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/interact:text-purple-600 dark:group-hover/interact:text-purple-400 transition-colors" />
                )}
                <span className={`text-xs transition-colors ${
                  isInteractive
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 group-hover/interact:text-purple-600 dark:group-hover/interact:text-purple-400'
                }`}>
                  {isInteractive ? 'Interactive' : 'Non-Interactive'}
                </span>
              </button>
            </>
          )}

          {/* Live Capture Node Controls - Show when live capture node is selected (for editing existing capture) */}
          {isLiveCaptureNode && !isLiveCaptureActive && (
            <>
              {/* Divider if there are other controls before */}
              {(isBrushActive || isEraserActive) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              {/* Area Highlight Button - Shows floating crop area overlay or confirms selection */}
              <button
                onClick={async () => {
                  // Use Electron overlay window for system-wide visibility
                  if (typeof window !== 'undefined' && (window as any).electronAPI?.openCropAreaOverlay) {
                    try {
                      // Close any existing React-based crop area
                      setShowFloatingCropArea(false);
                      // Open Electron overlay window
                      await (window as any).electronAPI.openCropAreaOverlay({
                        defaultWidth: 779,
                        defaultHeight: 513,
                      });
                    } catch (error) {
                      console.error('Error opening crop area overlay:', error);
                      // Fallback to React component
                      setShowFloatingCropArea(true);
                    }
                  } else {
                    // Fallback to React component if Electron API not available
                    if (showFloatingCropArea) {
                      const event = new CustomEvent('confirm-crop-area');
                      window.dispatchEvent(event);
                    } else {
                      setShowFloatingCropArea(true);
                    }
                  }
                }}
                className={`p-1.5 rounded-lg transition-all duration-150 group/area flex items-center gap-1.5 ${
                  showFloatingCropArea
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400'
                }`}
                title={showFloatingCropArea ? 'Confirm selection (or click checkmark on crop area)' : 'Area Highlight - Select an area to capture'}
              >
                <Crop className="w-4 h-4 group-hover/area:text-purple-600 dark:group-hover/area:text-purple-400 transition-colors" />
                <span className={`text-xs transition-colors ${
                  showFloatingCropArea
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 group-hover/area:text-purple-600 dark:group-hover/area:text-purple-400'
                }`}>
                  {showFloatingCropArea ? 'Confirm Area' : 'Area Highlight'}
                </span>
              </button>
              
              {/* Cancel button - Show when crop area is visible - also deselects live capture tool */}
              {(showFloatingCropArea || (typeof window !== 'undefined' && (window as any).electronAPI?.closeCropAreaOverlay)) && (
                <button
                  onClick={async () => {
                    // Close Electron overlay if open
                    if (typeof window !== 'undefined' && (window as any).electronAPI?.closeCropAreaOverlay) {
                      try {
                        await (window as any).electronAPI.closeCropAreaOverlay();
                      } catch (error) {
                        console.error('Error closing crop area overlay:', error);
                      }
                    }
                    // Close React component
                    setShowFloatingCropArea(false);
                    // Deactivate live capture tool
                    setIsLiveCaptureActive(false);
                    window.dispatchEvent(new CustomEvent('toggle-live-capture-mode', { 
                      detail: { enabled: false } 
                    }));
                  }}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/cancel flex items-center gap-1.5"
                  title="Cancel area selection and deselect live capture tool (or press ESC)"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/cancel:text-red-600 dark:group-hover/cancel:text-red-400 transition-colors" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 group-hover/cancel:text-red-600 dark:group-hover/cancel:text-red-400 transition-colors">
                    Cancel
                  </span>
                </button>
              )}
            </>
          )}


          {/* Iframe Widget Configuration */}
          {isIframeWidget && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <Globe className="w-4 h-4 text-blue-500" />
                <input
                  type="text"
                  value={widgetUrl}
                  onChange={(e) => {
                    e.stopPropagation();
                    setWidgetUrl(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      handleSaveWidgetUrl();
                    }
                  }}
                  onBlur={handleUrlBlur}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Enter URL (e.g., https://discord.com)"
                  className="bg-transparent border-0 outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 min-w-[200px] max-w-[300px]"
                />
                <button
                  onClick={handleSaveWidgetUrl}
                  className="p-1 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-colors"
                  title="Save URL"
                >
                  <Save className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </>
          )}

          {/* WebView Widget Configuration */}
          {isWebViewWidget && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <Globe2 className="w-4 h-4 text-green-500" />
                <input
                  type="text"
                  value={widgetUrl}
                  onChange={(e) => {
                    e.stopPropagation();
                    setWidgetUrl(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      handleSaveWidgetUrl();
                    }
                  }}
                  onBlur={handleUrlBlur}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Enter URL (bypasses CORS)"
                  className="bg-transparent border-0 outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 min-w-[200px] max-w-[300px]"
                />
                <button
                  onClick={handleSaveWidgetUrl}
                  className="p-1 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-colors"
                  title="Save URL"
                >
                  <Save className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </>
          )}

          {/* Native Window Widget Configuration */}
          {isNativeWindowWidget && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <Monitor className="w-4 h-4 text-orange-500" />
                <input
                  type="text"
                  value={widgetProcessName}
                  onChange={(e) => {
                    e.stopPropagation();
                    setWidgetProcessName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      handleSaveNativeWindowConfig();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Process name (e.g., Discord)"
                  className="bg-transparent border-0 outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 min-w-[120px] max-w-[150px]"
                />
                <input
                  type="text"
                  value={widgetWindowTitle}
                  onChange={(e) => {
                    e.stopPropagation();
                    setWidgetWindowTitle(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      handleSaveNativeWindowConfig();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Window title (optional)"
                  className="bg-transparent border-0 outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 min-w-[120px] max-w-[150px]"
                />
                <button
                  onClick={handleSaveNativeWindowConfig}
                  className="p-1 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-colors"
                  title="Save configuration"
                >
                  <Save className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </>
          )}

          {/* Shape Tool Settings - Show ONLY when shape node is selected, NOT when creation tools are active */}
          {isShapeNode && !isCreationToolsActive && (
            <>
              {/* Divider if there are other controls before */}
              {(isBrushActive || isEraserActive || isLiveCaptureNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}

              {/* Undo/Redo */}
              <button
                onClick={handleUndo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/undo"
                title="Undo"
              >
                <Undo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/undo:text-gray-800 dark:group-hover/undo:text-gray-200 transition-colors" />
              </button>
              <button
                onClick={handleRedo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/redo"
                title="Redo"
              >
                <Redo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/redo:text-gray-800 dark:group-hover/redo:text-gray-200 transition-colors" />
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Fill Color Picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowFillColorPicker(!showFillColorPicker);
                    setShowStrokeColorPicker(false);
                  }}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/fill flex items-center gap-1.5"
                  title="Fill Color"
                >
                  <Square className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/fill:text-green-600 dark:group-hover/fill:text-green-400 transition-colors" />
                  <div
                    className="w-4 h-4 rounded border border-gray-300/50 dark:border-gray-600/50"
                    style={{ backgroundColor: fillColor }}
                  />
                </button>
                
                {/* Fill Color Picker Popup */}
                {showFillColorPicker && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50">
                    <div className="grid grid-cols-5 gap-2 w-[200px]">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setFillColor(color);
                            setShowFillColorPicker(false);
                            if (selectedNode && selectedNodeId) {
                              const content = typeof selectedNode.content === 'object' && selectedNode.content
                                ? selectedNode.content as any
                                : { type: nodeType, fillColor: '#FFFFFF', borderColor: '#000000', borderWidth: 1 };
                              updateWorkspaceNode(selectedNodeId, {
                                content: { ...content, fillColor: color },
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            fillColor === color
                              ? 'border-gray-800 dark:border-gray-200 ring-2 ring-green-500/50'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                      <input
                        type="color"
                        value={fillColor}
                        onChange={(e) => {
                          setFillColor(e.target.value);
                          if (selectedNode && selectedNodeId) {
                            const content = typeof selectedNode.content === 'object' && selectedNode.content
                              ? selectedNode.content as any
                              : { type: nodeType, fillColor: '#FFFFFF', borderColor: '#000000', borderWidth: 1 };
                            updateWorkspaceNode(selectedNodeId, {
                              content: { ...content, fillColor: e.target.value },
                            });
                          }
                        }}
                        className="w-full h-8 rounded cursor-pointer"
                        title="Custom fill color"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Stroke Color Picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowStrokeColorPicker(!showStrokeColorPicker);
                    setShowFillColorPicker(false);
                  }}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/stroke flex items-center gap-1.5"
                  title="Stroke Color"
                >
                  <div className="w-4 h-4 rounded border-2" style={{ borderColor: strokeColor, backgroundColor: 'transparent' }} />
                </button>
                
                {/* Stroke Color Picker Popup */}
                {showStrokeColorPicker && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50">
                    <div className="grid grid-cols-5 gap-2 w-[200px]">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setStrokeColor(color);
                            setShowStrokeColorPicker(false);
                            if (selectedNode && selectedNodeId) {
                              const content = typeof selectedNode.content === 'object' && selectedNode.content
                                ? selectedNode.content as any
                                : { type: nodeType, fillColor: '#FFFFFF', borderColor: '#000000', borderWidth: 1 };
                              updateWorkspaceNode(selectedNodeId, {
                                content: { ...content, borderColor: color },
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            strokeColor === color
                              ? 'border-gray-800 dark:border-gray-200 ring-2 ring-green-500/50'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => {
                          setStrokeColor(e.target.value);
                          if (selectedNode && selectedNodeId) {
                            const content = typeof selectedNode.content === 'object' && selectedNode.content
                              ? selectedNode.content as any
                              : { type: nodeType, fillColor: '#FFFFFF', borderColor: '#000000', borderWidth: 1 };
                            updateWorkspaceNode(selectedNodeId, {
                              content: { ...content, borderColor: e.target.value },
                            });
                          }
                        }}
                        className="w-full h-8 rounded cursor-pointer"
                        title="Custom stroke color"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Duplicate */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('duplicate-selected-node'));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/duplicate"
                title="Quick Duplicate"
              >
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/duplicate:text-green-600 dark:group-hover/duplicate:text-green-400 transition-colors" />
              </button>
            </>
          )}

          {/* Diagramming Tools Controls - Show when diagramming tools are active or connection node is selected */}
          {(isDiagrammingToolsActive || isConnectionNode) && (
            <>
              {/* Divider if there are other controls before */}
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isCreationToolsActive || isShapeNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}

              {/* Smart Connection Snap Toggle */}
              <button
                onClick={() => setSmartSnap(!smartSnap)}
                className={`p-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                  smartSnap
                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                    : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400'
                }`}
                title={smartSnap ? 'Disable Smart Snap' : 'Enable Smart Snap'}
              >
                <GitBranch className="w-4 h-4" />
                <span className="text-xs">Smart Snap</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Arrowhead Style Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowArrowheadMenu(!showArrowheadMenu)}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/arrowhead flex items-center gap-1.5"
                  title="Arrowhead Style"
                >
                  <ArrowRight className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/arrowhead:text-indigo-600 dark:group-hover/arrowhead:text-indigo-400 transition-colors" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{arrowheadStyle}</span>
                </button>
                
                {/* Arrowhead Style Menu */}
                {showArrowheadMenu && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50 min-w-[140px]">
                    {(['arrow', 'diamond', 'circle'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setArrowheadStyle(style);
                          setShowArrowheadMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          arrowheadStyle === style
                            ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                            : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-sm capitalize">{style}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Layering Controls */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('bring-to-front'));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/layer"
                title="Bring to Front"
              >
                <Layers className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/layer:text-indigo-600 dark:group-hover/layer:text-indigo-400 transition-colors" />
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('send-to-back'));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/layer"
                title="Send to Back"
              >
                <Layers className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/layer:text-indigo-600 dark:group-hover/layer:text-indigo-400 transition-colors rotate-180" />
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Layout Optimization */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('optimize-layout'));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/optimize flex items-center gap-1.5"
                title="Optimize Layout"
              >
                <Layout className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/optimize:text-indigo-600 dark:group-hover/optimize:text-indigo-400 transition-colors" />
                <span className="text-xs">Optimize</span>
              </button>
            </>
          )}

          {/* Facilitation & AI Tools Controls - Show when facilitation tools are active */}
          {isFacilitationToolsActive && (
            <>
              {/* Divider if there are other controls before */}
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isCreationToolsActive || isShapeNode || isDiagrammingToolsActive || isConnectionNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}

              {/* Timer Controls */}
              <div className="relative">
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className={`p-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                    timerActive
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title={timerActive ? 'Stop Timer' : 'Start Timer'}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">
                    {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Voting Controls */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('start-voting'));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/vote flex items-center gap-1.5"
                title="Start Voting"
              >
                <Vote className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/vote:text-amber-600 dark:group-hover/vote:text-amber-400 transition-colors" />
                <span className="text-xs">Vote</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* AI Clustering/Summarization */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('ai-cluster-notes'));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/ai flex items-center gap-1.5"
                title="AI Clustering & Summarization"
              >
                <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/ai:text-amber-600 dark:group-hover/ai:text-amber-400 transition-colors" />
                <span className="text-xs">AI Cluster</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Presentation Mode Toggle */}
              <button
                onClick={() => setPresentationMode(!presentationMode)}
                className={`p-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                  presentationMode
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400'
                }`}
                title={presentationMode ? 'Exit Presentation Mode' : 'Enter Presentation Mode'}
              >
                <Presentation className="w-4 h-4" />
                <span className="text-xs">Present</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Participant Attention Management */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('manage-attention'));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/attention flex items-center gap-1.5"
                title="Participant Attention Management"
              >
                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/attention:text-amber-600 dark:group-hover/attention:text-amber-400 transition-colors" />
                <span className="text-xs">Attention</span>
              </button>
            </>
          )}

          {/* Text Tool Settings */}
          {(isTextNode || isTextToolActive) && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isLiveCaptureActive) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              {/* Font Family */}
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  updateTextNodeContent({ fontFamily: e.target.value });
                }}
                className="px-2 py-1.5 bg-gray-100/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {GOOGLE_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              
              {/* Font Size */}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <button
                  onClick={() => {
                    const newSize = Math.max(8, fontSize - 2);
                    setFontSize(newSize);
                    updateTextNodeContent({ fontSize: newSize });
                  }}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded"
                >
                  <Minus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={fontSize}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 8;
                    const clamped = Math.max(8, Math.min(120, value));
                    setFontSize(clamped);
                    updateTextNodeContent({ fontSize: clamped });
                  }}
                  className="w-14 text-xs bg-transparent border-0 text-center text-gray-700 dark:text-gray-200 focus:outline-none"
                />
                <button
                  onClick={() => {
                    const newSize = Math.min(72, fontSize + 2);
                    setFontSize(newSize);
                    updateTextNodeContent({ fontSize: newSize });
                  }}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded"
                >
                  <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Font Styles */}
              <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
                    setFontWeight(newWeight);
                    updateTextNodeContent({ fontWeight: newWeight });
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    fontWeight === 'bold'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const nextItalic = !isItalic;
                    setIsItalic(nextItalic);
                    updateTextNodeContent({ isItalic: nextItalic });
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    isItalic
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const nextUnderline = !isUnderline;
                    setIsUnderline(nextUnderline);
                    updateTextNodeContent({ isUnderline: nextUnderline });
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    isUnderline
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const nextWrap = !textWrap;
                    setTextWrap(nextWrap);
                    updateTextNodeContent({ textWrap: nextWrap });
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    textWrap
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title={textWrap ? 'Disable text wrap' : 'Enable text wrap'}
                >
                  <WrapText className="w-4 h-4" />
                </button>
              </div>
              
              {/* Text Align */}
              <div className="flex items-center gap-0.5 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    setTextAlign('left');
                    updateTextNodeContent({ textAlign: 'left' });
                  }}
                  className={`p-1 rounded transition-all ${
                    textAlign === 'left'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setTextAlign('center');
                    updateTextNodeContent({ textAlign: 'center' });
                  }}
                  className={`p-1 rounded transition-all ${
                    textAlign === 'center'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setTextAlign('right');
                    updateTextNodeContent({ textAlign: 'right' });
                  }}
                  className={`p-1 rounded transition-all ${
                    textAlign === 'right'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {/* Text Color */}
              <div className="relative">
                <button
                  onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all"
                  title="Text Color"
                >
                  <Type className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                {showTextColorPicker && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50">
                    <div className="grid grid-cols-5 gap-2 w-[200px]">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setTextColor(color);
                            setShowTextColorPicker(false);
                            updateTextNodeContent({ color });
                          }}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            textColor === color
                              ? 'border-gray-800 dark:border-gray-200 ring-2 ring-blue-500/50'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                          updateTextNodeContent({ color: e.target.value });
                        }}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Timer Tool Settings - Show when timer node is selected */}
          {isTimerNode && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isLiveCaptureActive || isTextNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              <button
                onClick={async () => {
                  if (selectedNode && selectedNodeId) {
                    const content = typeof selectedNode.content === 'object' && selectedNode.content?.type === 'timer'
                      ? selectedNode.content
                      : { type: 'timer', duration: 300, isRunning: false, timeRemaining: 300 };
                    const newRunning = !content.isRunning;
                    updateWorkspaceNode(selectedNodeId, {
                      content: { ...content, isRunning: newRunning },
                    });
                    
                    // Persist to API
                    try {
                      await fetch('/api/nodes/update', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          nodeId: selectedNodeId,
                          content: { ...content, isRunning: newRunning },
                        }),
                      });
                    } catch (error) {
                      console.error('Error updating timer:', error);
                    }
                  }
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all flex items-center gap-1.5"
                title="Start/Pause Timer"
              >
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-xs">Start/Pause</span>
              </button>
              
              <button
                onClick={async () => {
                  if (selectedNode && selectedNodeId) {
                    const content = typeof selectedNode.content === 'object' && selectedNode.content?.type === 'timer'
                      ? selectedNode.content
                      : { type: 'timer', duration: 300, isRunning: false, timeRemaining: 300 };
                    updateWorkspaceNode(selectedNodeId, {
                      content: { ...content, isRunning: false, timeRemaining: content.duration || 300 },
                    });
                    
                    // Persist to API
                    try {
                      await fetch('/api/nodes/update', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          nodeId: selectedNodeId,
                          content: { ...content, isRunning: false, timeRemaining: content.duration || 300 },
                        }),
                      });
                    } catch (error) {
                      console.error('Error resetting timer:', error);
                    }
                  }
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all flex items-center gap-1.5"
                title="Reset Timer"
              >
                <Square className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-xs">Reset</span>
              </button>
            </>
          )}

          {/* Voting Tool Settings - Show when voting node is selected */}
          {isVotingNode && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isLiveCaptureActive || isTextNode || isTimerNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              <button
                onClick={async () => {
                  if (selectedNode && selectedNodeId) {
                    const content = typeof selectedNode.content === 'object' && selectedNode.content?.type === 'voting'
                      ? selectedNode.content
                      : { type: 'voting', question: '', options: [], votes: {} };
                    const newOptions = [...(content.options || []), `Option ${(content.options?.length || 0) + 1}`];
                    updateWorkspaceNode(selectedNodeId, {
                      content: { ...content, options: newOptions },
                    });
                    
                    // Persist to API
                    try {
                      await fetch('/api/nodes/update', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          nodeId: selectedNodeId,
                          content: { ...content, options: newOptions },
                        }),
                      });
                    } catch (error) {
                      console.error('Error adding voting option:', error);
                    }
                  }
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all flex items-center gap-1.5"
                title="Add Option"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-xs">Add Option</span>
              </button>
            </>
          )}

          {/* Code Block Tool Settings - Show when code block node is selected */}
          {isCodeBlockNode && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isLiveCaptureActive || isTextNode || isTimerNode || isVotingNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              <select
                value={codeLanguage}
                onChange={(e) => {
                  setCodeLanguage(e.target.value);
                  if (selectedNode && selectedNodeId) {
                    const content = typeof selectedNode.content === 'object' && selectedNode.content?.type === 'code-block'
                      ? selectedNode.content
                      : { type: 'code-block', language: 'javascript', code: '' };
                    updateWorkspaceNode(selectedNodeId, {
                      content: { ...content, language: e.target.value },
                    });
                  }
                }}
                className="px-2 py-1.5 bg-gray-100/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="markdown">Markdown</option>
                <option value="bash">Bash</option>
                <option value="sql">SQL</option>
              </select>
            </>
          )}

          {/* Image Tool Settings - Show when image node is selected */}
          {isImageNode && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isLiveCaptureActive || isTextNode || isTimerNode || isVotingNode || isCodeBlockNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              {/* Image Size */}
              <div className="flex items-center gap-0.5 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    setImageSize('small');
                    if (selectedNode && selectedNodeId) {
                      const content = typeof selectedNode.content === 'object' && selectedNode.content
                        ? selectedNode.content as any
                        : { type: 'image', url: '' };
                      updateWorkspaceNode(selectedNodeId, {
                        content: { ...content, size: 'small' },
                      });
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    imageSize === 'small'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Small"
                >
                  S
                </button>
                <button
                  onClick={() => {
                    setImageSize('medium');
                    if (selectedNode && selectedNodeId) {
                      const content = typeof selectedNode.content === 'object' && selectedNode.content
                        ? selectedNode.content as any
                        : { type: 'image', url: '' };
                      updateWorkspaceNode(selectedNodeId, {
                        content: { ...content, size: 'medium' },
                      });
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    imageSize === 'medium'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Medium"
                >
                  M
                </button>
                <button
                  onClick={() => {
                    setImageSize('large');
                    if (selectedNode && selectedNodeId) {
                      const content = typeof selectedNode.content === 'object' && selectedNode.content
                        ? selectedNode.content as any
                        : { type: 'image', url: '' };
                      updateWorkspaceNode(selectedNodeId, {
                        content: { ...content, size: 'large' },
                      });
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    imageSize === 'large'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Large"
                >
                  L
                </button>
              </div>
              
              {/* Image Alignment */}
              <div className="flex items-center gap-0.5 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    setImageAlign('left');
                    if (selectedNode && selectedNodeId) {
                      const content = typeof selectedNode.content === 'object' && selectedNode.content
                        ? selectedNode.content as any
                        : { type: 'image', url: '' };
                      updateWorkspaceNode(selectedNodeId, {
                        content: { ...content, alignment: 'left' },
                      });
                    }
                  }}
                  className={`p-1 rounded transition-all ${
                    imageAlign === 'left'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setImageAlign('center');
                    if (selectedNode && selectedNodeId) {
                      const content = typeof selectedNode.content === 'object' && selectedNode.content
                        ? selectedNode.content as any
                        : { type: 'image', url: '' };
                      updateWorkspaceNode(selectedNodeId, {
                        content: { ...content, alignment: 'center' },
                      });
                    }
                  }}
                  className={`p-1 rounded transition-all ${
                    imageAlign === 'center'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setImageAlign('right');
                    if (selectedNode && selectedNodeId) {
                      const content = typeof selectedNode.content === 'object' && selectedNode.content
                        ? selectedNode.content as any
                        : { type: 'image', url: '' };
                      updateWorkspaceNode(selectedNodeId, {
                        content: { ...content, alignment: 'right' },
                      });
                    }
                  }}
                  className={`p-1 rounded transition-all ${
                    imageAlign === 'right'
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Note/Sticky Note Tool Settings - Show when note or sticky note node is selected */}
          {(isNoteNode || isStickyNoteNode) && (
            <>
              {(isBrushActive || isEraserActive || isLiveCaptureNode || isLiveCaptureActive || isTextNode || isTimerNode || isVotingNode || isCodeBlockNode || isImageNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              {/* Note Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all"
                  title="Note Color"
                >
                  <Palette className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                {showColorPicker && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50">
                    <div className="grid grid-cols-5 gap-2 w-[200px]">
                      {['#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#4CAF50', '#8BC34A', '#CDDC39', '#FFFFFF'].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setNoteColor(color);
                            setShowColorPicker(false);
                            if (selectedNode && selectedNodeId) {
                              const content = typeof selectedNode.content === 'object' && selectedNode.content
                                ? selectedNode.content
                                : { type: isStickyNoteNode ? 'note' : 'note' };
                              updateWorkspaceNode(selectedNodeId, {
                                content: { ...content, color },
                              });
                            }
                          }}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            noteColor === color
                              ? 'border-gray-800 dark:border-gray-200 ring-2 ring-blue-500/50'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Node Editing Options - Only show when node is selected and no other tools/controls are active */}
          {selectedNodeId && !isBrushActive && !isEraserActive && !isLiveCaptureNode && !isLiveCaptureActive && !isIframeWidget && !isWebViewWidget && !isNativeWindowWidget && !isCreationToolsActive && !isShapeNode && !isDiagrammingToolsActive && !isConnectionNode && !isFacilitationToolsActive && !isTextNode && !isTimerNode && !isVotingNode && !isCodeBlockNode && !isImageNode && !isNoteNode && !isStickyNoteNode && (
            <div className="w-2 h-2 rounded-full bg-gray-300/50 dark:bg-gray-600/50" />
          )}
        </div>

        {/* Subtle glow effect */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-blue-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"
          style={{ transform: 'scale(1.1)' }}
        />
      </div>

      {/* Floating Crop Area Overlay - Can be positioned outside app bounds */}
      <FloatingCropArea
        isOpen={showFloatingCropArea}
        onClose={() => setShowFloatingCropArea(false)}
        onConfirm={handleCropAreaConfirm}
        defaultWidth={779}
        defaultHeight={513}
      />
    </div>
  );
};

export default HorizontalEditorBar;
