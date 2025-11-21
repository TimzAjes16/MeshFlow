/**
 * Color palette for topic/cluster visualization
 * Each color represents a different semantic cluster or topic
 */
export const CLUSTER_COLORS = [
  // Purple/Pink gradients
  { primary: '#a855f7', secondary: '#ec4899', name: 'purple-pink' },
  // Blue/Cyan gradients
  { primary: '#3b82f6', secondary: '#06b6d4', name: 'blue-cyan' },
  // Pink/Orange gradients
  { primary: '#ec4899', secondary: '#f97316', name: 'pink-orange' },
  // Yellow/Amber (default)
  { primary: '#facc15', secondary: '#f59e0b', name: 'yellow-amber' },
  // Green/Emerald
  { primary: '#10b981', secondary: '#34d399', name: 'green-emerald' },
  // Indigo/Violet
  { primary: '#6366f1', secondary: '#8b5cf6', name: 'indigo-violet' },
  // Red/Rose
  { primary: '#ef4444', secondary: '#f87171', name: 'red-rose' },
  // Teal/Cyan
  { primary: '#14b8a6', secondary: '#22d3ee', name: 'teal-cyan' },
] as const;

/**
 * Get color for a node based on its tags or content
 */
export function getNodeColor(node: { tags?: string[]; title?: string; content?: any }): {
  primary: string;
  secondary: string;
  name: string;
} {
  // If node has tags, use first tag to determine color
  if (node.tags && node.tags.length > 0) {
    const tagHash = node.tags[0].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CLUSTER_COLORS[tagHash % CLUSTER_COLORS.length];
  }

  // Otherwise, use title hash
  if (node.title) {
    const titleHash = node.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CLUSTER_COLORS[titleHash % CLUSTER_COLORS.length];
  }

  // Default to yellow
  return CLUSTER_COLORS[3];
}

/**
 * Get CSS gradient string for a color
 */
export function getColorGradient(color: { primary: string; secondary: string }): string {
  return `radial-gradient(circle, ${color.primary} 0%, ${color.secondary} 50%, ${color.primary}00 100%)`;
}

/**
 * Get box shadow for glow effect with color
 */
export function getGlowShadow(color: { primary: string; secondary: string }, intensity: number = 0.6, selected: boolean = false): string {
  if (selected) {
    return `0 0 ${20 * intensity}px ${color.primary}80, 0 0 ${40 * intensity}px ${color.primary}40, 0 0 ${60 * intensity}px ${color.primary}20`;
  }
  return `0 0 ${15 * intensity}px ${color.primary}60, 0 0 ${30 * intensity}px ${color.primary}30, 0 0 ${45 * intensity}px ${color.primary}15`;
}
