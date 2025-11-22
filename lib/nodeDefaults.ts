/**
 * Default content structures for each node type
 * Ensures consistent node creation across the application
 */

import type { NodeTypeId } from './nodeTypes';

export interface DefaultNodeContent {
  type: NodeTypeId;
  [key: string]: any;
}

/**
 * Get default content structure for a node type
 */
export function getDefaultNodeContent(type: NodeTypeId): DefaultNodeContent {
  switch (type) {
    case 'text':
      return {
        type: 'text',
        text: '',
      };

    case 'note':
      return {
        type: 'note',
        title: 'New Note',
        body: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
      };

    case 'link':
      return {
        type: 'link',
        url: '',
        preview: true,
      };

    case 'image':
      return {
        type: 'image',
        url: '',
        size: 'medium',
        alignment: 'center',
      };

    case 'box':
      return {
        type: 'box',
        fill: true,
        fillColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 1,
      };

    case 'circle':
      return {
        type: 'circle',
        fill: true,
        fillColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 1,
      };

    case 'arrow':
      return {
        type: 'arrow',
        direction: 'right',
        color: '#000000',
      };

    case 'emoji':
      return {
        type: 'emoji',
        emoji: '😀',
      };

    case 'bar-chart':
      return {
        type: 'bar-chart',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [
            {
              label: 'Values',
              data: [10, 20, 30],
              backgroundColor: '#3b82f6',
            },
          ],
        },
      };

    case 'line-chart':
      return {
        type: 'line-chart',
        data: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [
            {
              label: 'Values',
              data: [10, 20, 30],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            },
          ],
        },
      };

    case 'pie-chart':
      return {
        type: 'pie-chart',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [
            {
              data: [30, 40, 30],
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
            },
          ],
        },
      };

    case 'area-chart':
      return {
        type: 'area-chart',
        data: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [
            {
              label: 'Values',
              data: [10, 20, 30],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
            },
          ],
        },
      };

    case 'live-capture':
      return {
        type: 'live-capture',
        imageUrl: '',
        cropArea: { x: 0, y: 0, width: 0, height: 0 },
        sourceUrl: '',
        captureHistory: [],
      };

    default:
      return {
        type: 'note',
        title: 'New Note',
        body: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
      };
  }
}

/**
 * Get default title for a node type
 */
export function getDefaultNodeTitle(type: NodeTypeId): string {
  switch (type) {
    case 'text':
      return 'Text Block';
    case 'note':
      return 'New Note';
    case 'link':
      return 'Link';
    case 'image':
      return 'Image';
    case 'box':
      return 'Box';
    case 'circle':
      return 'Circle';
    case 'arrow':
      return 'Arrow';
    case 'emoji':
      return 'Emoji';
    case 'bar-chart':
      return 'Bar Chart';
    case 'line-chart':
      return 'Line Chart';
    case 'pie-chart':
      return 'Pie Chart';
    case 'area-chart':
      return 'Area Chart';
    case 'live-capture':
      return 'Live Capture';
    default:
      return 'Untitled';
  }
}

