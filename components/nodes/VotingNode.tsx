/**
 * Voting Node Component
 * Renders an editable poll with options and vote tracking
 */

import { memo, useState, useEffect, useCallback } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Vote, Plus, X } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface VotingNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface VotingContent {
  type: 'voting';
  question: string;
  options: string[];
  votes: Record<string, number>; // option index -> vote count
}

function VotingNode({ data, selected, id }: VotingNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  // Extract voting content
  const votingContent: VotingContent = typeof node.content === 'object' && node.content?.type === 'voting'
    ? node.content
    : { 
        type: 'voting', 
        question: '',
        options: [],
        votes: {},
      };

  const [question, setQuestion] = useState(votingContent.question || '');
  const [options, setOptions] = useState(votingContent.options || []);
  const [votes, setVotes] = useState(votingContent.votes || {});
  const [newOption, setNewOption] = useState('');

  // Calculate total votes
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

  // Persist voting state to node
  useEffect(() => {
    const updateVoting = () => {
      updateNode(id, {
        content: {
          type: 'voting',
          question,
          options,
          votes,
        },
      });

      // Also update via API
      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            content: {
              type: 'voting',
              question,
              options,
              votes,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateVoting, 500);
    return () => clearTimeout(timer);
  }, [id, question, options, votes, updateNode]);

  const handleAddOption = useCallback(() => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions((prev) => [...prev, newOption.trim()]);
      setNewOption('');
    }
  }, [newOption, options]);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setVotes((prev) => {
      const newVotes = { ...prev };
      delete newVotes[index.toString()];
      // Reindex votes
      const reindexed: Record<string, number> = {};
      Object.keys(newVotes).forEach((key) => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          reindexed[(oldIndex - 1).toString()] = newVotes[key];
        } else if (oldIndex < index) {
          reindexed[key] = newVotes[key];
        }
      });
      return reindexed;
    });
  }, []);

  const handleVote = useCallback((optionIndex: number) => {
    setVotes((prev) => ({
      ...prev,
      [optionIndex.toString()]: (prev[optionIndex.toString()] || 0) + 1,
    }));
  }, []);

  const getPercentage = (optionIndex: number): number => {
    if (totalVotes === 0) return 0;
    const voteCount = votes[optionIndex.toString()] || 0;
    return (voteCount / totalVotes) * 100;
  };

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-white border border-gray-200/50 rounded-md p-3 w-full h-full flex flex-col gap-3 transition-all duration-150 hover:border-gray-300/50"
        style={{
          minWidth: node.width || 300,
          minHeight: node.height || 200,
        }}
      >
        <div className="flex items-center gap-2 text-blue-800">
          <Vote className="w-5 h-5" />
          <span className="font-semibold text-sm">Voting</span>
        </div>

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question..."
          className="w-full px-3 py-2 bg-white border border-blue-300 rounded text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!selected}
        />

        <div className="flex-1 overflow-y-auto space-y-2">
          {options.map((option, index) => {
            const voteCount = votes[index.toString()] || 0;
            const percentage = getPercentage(index);
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(index)}
                    disabled={!selected}
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-left text-sm hover:bg-blue-50 disabled:hover:bg-white transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900">{option || `Option ${index + 1}`}</span>
                      <span className="text-blue-600 font-semibold">{voteCount}</span>
                    </div>
                    {totalVotes > 0 && (
                      <div className="mt-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    )}
                  </button>
                  {selected && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddOption();
                }
              }}
              placeholder="Add option..."
              className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddOption}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        )}

        {totalVotes > 0 && (
          <div className="text-xs text-blue-700 text-center">
            Total votes: {totalVotes}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(VotingNode);

