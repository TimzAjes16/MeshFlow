'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';

const COLORS = [
  '#4f46e5', // indigo
  '#0ea5e9', // sky
  '#22c55e', // green
  '#eab308', // yellow
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#f97316', // orange
  '#14b8a6', // teal
];

type Workspace = {
  id: string;
  name: string;
  nodeCount?: number;
  edgeCount?: number;
};

type Props = {
  workspaces: Workspace[];
  searchQuery?: string;
};

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  color: string;
  nodeCount?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export default function WorkspaceGraph({ workspaces, searchQuery = '' }: Props) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);

  // Filter workspaces based on search
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery) return workspaces;
    return workspaces.filter((ws) =>
      ws.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [workspaces, searchQuery]);

  // Create graph data
  const { nodes, links } = useMemo(() => {
    if (filteredWorkspaces.length === 0) {
      return { nodes: [], links: [] };
    }

    const graphNodes: GraphNode[] = filteredWorkspaces.map((ws, index) => ({
      id: ws.id,
      name: ws.name,
      color: COLORS[index % COLORS.length],
      nodeCount: ws.nodeCount,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
    }));

    // Create links between workspaces (connect each to a few others for visual interest)
    const graphLinks: GraphLink[] = [];
    for (let i = 0; i < graphNodes.length; i++) {
      // Connect to next 2-3 workspaces
      for (let j = 1; j <= Math.min(3, graphNodes.length - 1); j++) {
        const targetIndex = (i + j) % graphNodes.length;
        if (targetIndex !== i) {
          graphLinks.push({
            source: graphNodes[i].id,
            target: graphNodes[targetIndex].id,
          });
        }
      }
    }

    return { nodes: graphNodes, links: graphLinks };
  }, [filteredWorkspaces, dimensions]);

  // Initialize and update simulation
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set up dimensions
    const width = dimensions.width;
    const height = dimensions.height;

    // Create simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => (d as GraphNode).id)
          .distance(120)
          .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    simulationRef.current = simulation;

    // Create container group
    const g = svg.append('g');

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Draw links
    const link = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        router.push(`/workspace/${d.id}/canvas`);
      })
      .on('mouseenter', (event, d) => {
        setHighlightedNodeId(d.id);
      })
      .on('mouseleave', () => {
        setHighlightedNodeId(null);
      });

    // Store nodes reference
    nodesRef.current = nodes;

    // Add circles for nodes
    node
      .append('circle')
      .attr('r', (d) => (d.nodeCount && d.nodeCount > 0 ? 20 + Math.min(d.nodeCount / 10, 10) : 20))
      .attr('fill', (d) => {
        // Highlight if matches search
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch ? '#f59e0b' : d.color;
      })
      .attr('stroke', (d) => {
        if (highlightedNodeId === d.id) return '#fff';
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch ? '#f59e0b' : d.color;
      })
      .attr('stroke-width', (d) => {
        if (highlightedNodeId === d.id) return 3;
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch ? 2 : 0;
      })
      .style('filter', (d) => {
        if (highlightedNodeId === d.id) {
          return `drop-shadow(0 0 12px ${d.color})`;
        }
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch
          ? `drop-shadow(0 0 8px #f59e0b)`
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';
      });

    // Add text labels
    node
      .append('text')
      .text((d) => d.name.slice(0, 2).toUpperCase())
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none');

    // Add name labels below nodes
    node
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .attr('fill', '#374151')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .style('opacity', (d) => (highlightedNodeId === d.id ? 1 : 0.7));

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Stop simulation after it stabilizes
    simulation.on('end', () => {
      simulation.stop();
    });

    // Let simulation run for a limited time, then stop
    setTimeout(() => {
      simulation.stop();
    }, 3000);

    // Handle window resize
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: 500,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Reset zoom on double-click background
    svg.on('dblclick.zoom', null); // Disable default double-click zoom
    svg.on('dblclick', () => {
      svg.transition().duration(750).call(
        zoom.transform as any,
        d3.zoomIdentity.translate(0, 0).scale(1)
      );
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      simulation.stop();
    };
  }, [nodes, links, dimensions, highlightedNodeId, router, searchQuery]);

  // Update highlighted node and search highlighting
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    svg
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .attr('fill', (d) => {
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch ? '#f59e0b' : d.color;
      })
      .attr('stroke', (d) => {
        if (highlightedNodeId === d.id) return '#fff';
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch ? '#f59e0b' : d.color;
      })
      .attr('stroke-width', (d) => {
        if (highlightedNodeId === d.id) return 3;
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch ? 2 : 0;
      })
      .style('filter', (d) => {
        if (highlightedNodeId === d.id) {
          return `drop-shadow(0 0 12px ${d.color})`;
        }
        const matchesSearch = searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch
          ? `drop-shadow(0 0 8px #f59e0b)`
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';
      });
  }, [highlightedNodeId, searchQuery]);

  if (filteredWorkspaces.length === 0) {
    return (
      <div className="mt-6 h-[500px] w-full flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <p className="text-slate-500 text-sm font-medium">
          {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
        </p>
        {!searchQuery && (
          <p className="text-slate-400 text-xs mt-1">
            Click &quot;New Workspace&quot; to get started
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
      <svg
        ref={svgRef}
        width="100%"
        height="500"
        className="w-full"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
}
