'use client';

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';

interface TextNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

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

type TextContent = typeof DEFAULT_TEXT_CONTENT;

function extractTextFromDoc(node: any): string {
  if (!node) return '';
  if (Array.isArray(node)) {
    return node.map(extractTextFromDoc).join('');
  }
  if (typeof node === 'object') {
    if (typeof node.text === 'string') {
      return node.text;
    }
    if (Array.isArray(node.content)) {
      return node.content.map(extractTextFromDoc).join('');
    }
  }
  return '';
}

function createTextContent(content: any): TextContent {
  if (content && typeof content === 'object' && content.type === 'text') {
    return { ...DEFAULT_TEXT_CONTENT, ...content };
  }
  if (content && typeof content === 'object' && content.type === 'doc') {
    return {
      ...DEFAULT_TEXT_CONTENT,
      value: extractTextFromDoc(content) || DEFAULT_TEXT_CONTENT.value,
    };
  }
  return { ...DEFAULT_TEXT_CONTENT };
}

function TextNode({ data, selected, id }: TextNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const { selectNode } = useCanvasStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textContent = createTextContent(node.content);
  const [localValue, setLocalValue] = useState(textContent.value || '');
  const [isEditing, setIsEditing] = useState(false);
  const textContentRef = useRef<TextContent>(textContent);
  textContentRef.current = { ...textContent, value: localValue };

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(textContent.value || '');
    }
  }, [textContent.value, isEditing]);

  useEffect(() => {
    if (editableRef.current && editableRef.current.innerText !== localValue) {
      editableRef.current.innerText = localValue;
    }
  }, [localValue]);

  const scheduleSave = useCallback((value: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      updateNode(id, {
        content: {
          ...textContentRef.current,
          value,
        },
      });
    }, 200);
  }, [id, updateNode]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!contentRef.current) return;

    let resizeTimeout: NodeJS.Timeout | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          const newWidth = Math.max(200, Math.min(400, Math.ceil(width + 24)));
          const autoHeightTarget = Math.ceil(height + 24);
          const MAX_AUTO_HEIGHT = 220;
          const newHeight = Math.max(60, Math.min(MAX_AUTO_HEIGHT, autoHeightTarget));

          const lastDims = lastDimensionsRef.current;
          const currentWidth = node.width || 200;
          const currentHeight = node.height || 60;
          const widthChanged = Math.abs(currentWidth - newWidth) > 5;
          const heightChanged = Math.abs(currentHeight - newHeight) > 5;
          const isRecentUpdate = lastDims &&
            Math.abs(lastDims.width - newWidth) < 2 &&
            Math.abs(lastDims.height - newHeight) < 2;

          if ((widthChanged || heightChanged) && !isRecentUpdate) {
            lastDimensionsRef.current = { width: newWidth, height: newHeight };
            updateNode(id, {
              width: newWidth,
              height: newHeight,
            });
          }
        }
      }, 100);
    });

    resizeObserver.observe(contentRef.current);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
    };
  }, [id, node.width, node.height, updateNode]);

  const appliedFontFamily = textContent.fontFamily;
  const appliedFontSize = textContent.fontSize;
  const appliedFontWeight = textContent.fontWeight;
  const appliedColor = textContent.color;
  const appliedTextAlign = textContent.textAlign;
  const appliedItalic = textContent.isItalic ? 'italic' : 'normal';
  const appliedUnderline = textContent.isUnderline ? 'underline' : 'none';
  const wrapEnabled = textContent.textWrap;

  const textStyles: CSSProperties = {
    fontFamily: appliedFontFamily,
    fontSize: `${appliedFontSize}px`,
    fontWeight: appliedFontWeight,
    textAlign: appliedTextAlign,
    color: appliedColor,
    fontStyle: appliedItalic,
    textDecoration: appliedUnderline,
    whiteSpace: wrapEnabled ? 'pre-wrap' : 'nowrap',
    overflowWrap: wrapEnabled ? 'anywhere' : 'normal',
  };

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const value = e.currentTarget.innerText;
    setLocalValue(value);
    scheduleSave(value);
  }, [scheduleSave]);

  const handleFocus = useCallback(() => {
    selectNode(id);
    setIsEditing(true);
  }, [id, selectNode]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  useEffect(() => {
    if (selected && editableRef.current) {
      setTimeout(() => {
        editableRef.current?.focus();
      }, 50);
    } else if (!selected) {
      setIsEditing(false);
    }
  }, [selected]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id}>
      <div
        ref={contentRef}
        className="p-3 min-w-[200px] max-w-[400px] bg-white rounded-md border border-gray-200/50 cursor-text transition-all duration-150 hover:border-gray-300"
        style={{
          width: node.width ? `${node.width}px` : 'fit-content',
          maxWidth: node.width ? `${node.width}px` : '400px',
          height: node.height ? `${node.height}px` : 'auto',
          minHeight: '40px',
          overflowY: 'auto',
          overflowX: wrapEnabled ? 'hidden' : 'auto',
        }}
      >
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className="outline-none min-h-[24px]"
          style={textStyles}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onPaste={handlePaste}
        >
          {localValue}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(TextNode);
