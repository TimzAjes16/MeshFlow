/**
 * Code Block Node Component
 * Renders a code editor/viewer with syntax highlighting
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Code } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface CodeBlockNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface CodeBlockContent {
  type: 'code-block';
  language: string;
  code: string;
}

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'html', 'css', 'json', 'markdown', 'bash', 'sql'];

function CodeBlockNode({ data, selected, id }: CodeBlockNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const codeContent: CodeBlockContent = typeof node.content === 'object' && node.content?.type === 'code-block'
    ? node.content
    : { 
        type: 'code-block', 
        language: 'javascript',
        code: '',
      };

  const [language, setLanguage] = useState(codeContent.language || 'javascript');
  const [code, setCode] = useState(codeContent.code || '');

  useEffect(() => {
    const updateCodeBlock = () => {
      updateNode(id, {
        content: {
          type: 'code-block',
          language,
          code,
        },
      });

      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            content: {
              type: 'code-block',
              language,
              code,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateCodeBlock, 500);
    return () => clearTimeout(timer);
  }, [id, language, code, updateNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-gray-900 border border-gray-700/50 rounded-md w-full h-full flex flex-col transition-all duration-150"
        style={{
          minWidth: node.width || 400,
          minHeight: node.height || 300,
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700/50 rounded-t-md">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-gray-400" />
            {selected ? (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-gray-400 font-mono">{language}</span>
            )}
          </div>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// Enter your code here..."
          className="flex-1 px-4 py-3 bg-gray-900 text-green-400 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-600 rounded-b-lg"
          style={{ fontFamily: 'monospace' }}
          disabled={!selected}
          spellCheck={false}
        />
      </div>
    </BaseNode>
  );
}

export default memo(CodeBlockNode);

