/**
 * Export utilities for workspace data
 */

import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';
import type { Workspace } from '@/types/Workspace';

export interface ExportData {
  workspace: Workspace;
  nodes: Node[];
  edges: Edge[];
  exported_at: string;
  exported_by: string;
  version?: string;
}

/**
 * Export workspace as JSON
 */
export function exportAsJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Export workspace as Markdown
 */
export function exportAsMarkdown(data: ExportData): string {
  let markdown = `# ${data.workspace.name}\n\n`;
  markdown += `**Exported:** ${new Date(data.exported_at).toLocaleString()}\n\n`;
  markdown += `**Nodes:** ${data.nodes.length} | **Connections:** ${data.edges.length}\n\n`;
  markdown += `---\n\n`;

  // Group nodes by tags
  const nodesByTag = new Map<string, Node[]>();
  const untaggedNodes: Node[] = [];

  data.nodes.forEach((node) => {
    if (node.tags && node.tags.length > 0) {
      node.tags.forEach((tag) => {
        if (!nodesByTag.has(tag)) {
          nodesByTag.set(tag, []);
        }
        nodesByTag.get(tag)!.push(node);
      });
    } else {
      untaggedNodes.push(node);
    }
  });

  // Write nodes by tag
  nodesByTag.forEach((nodes, tag) => {
    markdown += `## 📁 ${tag}\n\n`;
    nodes.forEach((node) => {
      markdown += writeNodeMarkdown(node, data.edges);
    });
  });

  // Write untagged nodes
  if (untaggedNodes.length > 0) {
    markdown += `## 📄 Uncategorized\n\n`;
    untaggedNodes.forEach((node) => {
      markdown += writeNodeMarkdown(node, data.edges);
    });
  }

  return markdown;
}

function writeNodeMarkdown(node: Node, edges: Edge[]): string {
  let md = `### ${node.title}\n\n`;

  // Extract text from JSONB content
  const contentText = extractTextFromContent(node.content);
  if (contentText) {
    md += `${contentText}\n\n`;
  }

  // Add connections
  const connections = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );
  if (connections.length > 0) {
    md += `**Connections:** ${connections.length}\n\n`;
  }

  md += `---\n\n`;
  return md;
}

function extractTextFromContent(content: any): string {
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && content !== null) {
    if (content.type === 'doc' && content.content) {
      return extractTextFromTipTap(content);
    }
    return JSON.stringify(content);
  }
  return '';
}

function extractTextFromTipTap(node: any): string {
  if (node.type === 'text' && node.text) {
    return node.text;
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child: any) => extractTextFromTipTap(child)).join(' ');
  }
  return '';
}

/**
 * Export workspace as Obsidian format (markdown files)
 */
export function exportAsObsidian(data: ExportData): Map<string, string> {
  const files = new Map<string, string>();

  data.nodes.forEach((node) => {
    let content = `# ${node.title}\n\n`;
    content += `Created: ${new Date(node.createdAt).toLocaleString()}\n\n`;
    
    if (node.tags && node.tags.length > 0) {
      content += `Tags: ${node.tags.map((t) => `[[${t}]]`).join(', ')}\n\n`;
    }

    const contentText = extractTextFromContent(node.content);
    if (contentText) {
      content += `${contentText}\n\n`;
    }

    // Add backlinks
    const backlinks = data.edges
      .filter((e) => e.target === node.id)
      .map((e) => {
        const sourceNode = data.nodes.find((n) => n.id === e.source);
        return sourceNode?.title || e.source;
      });

    if (backlinks.length > 0) {
      content += `## Backlinks\n\n`;
      backlinks.forEach((title) => {
        content += `- [[${title}]]\n`;
      });
    }

    // Add forward links
    const forwardLinks = data.edges
      .filter((e) => e.source === node.id)
      .map((e) => {
        const targetNode = data.nodes.find((n) => n.id === e.target);
        return targetNode?.title || e.target;
      });

    if (forwardLinks.length > 0) {
      content += `## Links\n\n`;
      forwardLinks.forEach((title) => {
        content += `- [[${title}]]\n`;
      });
    }

    const filename = `${node.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    files.set(filename, content);
  });

  return files;
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
