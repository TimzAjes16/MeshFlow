/**
 * Keyboard shortcuts configuration and handler
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: Map<string, (e: KeyboardEvent) => void> = new Map();

  register(shortcut: KeyboardShortcut) {
    const key = this.getKeyString(shortcut);
    this.shortcuts.set(key, shortcut);

    const handler = (e: KeyboardEvent) => {
      if (
        (shortcut.ctrl && !e.ctrlKey) ||
        (shortcut.shift && !e.shiftKey) ||
        (shortcut.alt && !e.altKey)
      ) {
        return;
      }

      if (
        (!shortcut.ctrl || e.ctrlKey) &&
        (!shortcut.shift || e.shiftKey) &&
        (!shortcut.alt || e.altKey) &&
        e.key.toLowerCase() === shortcut.key.toLowerCase()
      ) {
        e.preventDefault();
        shortcut.action();
      }
    };

    this.listeners.set(key, handler);
    window.addEventListener('keydown', handler);
  }

  unregister(keyString: string) {
    const handler = this.listeners.get(keyString);
    if (handler) {
      window.removeEventListener('keydown', handler);
      this.listeners.delete(keyString);
      this.shortcuts.delete(keyString);
    }
  }

  private getKeyString(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  getShortcutsByCategory(category?: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(
      (s) => !category || s.category === category
    );
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }
}

// Global shortcut manager instance
export const shortcutManager = new KeyboardShortcutManager();

// Default shortcuts
export const defaultShortcuts: KeyboardShortcut[] = [
  {
    key: 'n',
    ctrl: true,
    action: () => {
      // Create new node
      const event = new CustomEvent('createNode');
      window.dispatchEvent(event);
    },
    description: 'Create new node',
    category: 'Nodes',
  },
  {
    key: 'f',
    ctrl: true,
    action: () => {
      // Focus search
      const event = new CustomEvent('focusSearch');
      window.dispatchEvent(event);
    },
    description: 'Focus search',
    category: 'Navigation',
  },
  {
    key: 'k',
    ctrl: true,
    action: () => {
      // Open command palette
      const event = new CustomEvent('openCommandPalette');
      window.dispatchEvent(event);
    },
    description: 'Open command palette',
    category: 'Navigation',
  },
  {
    key: 'Escape',
    action: () => {
      // Close panels
      const event = new CustomEvent('closePanels');
      window.dispatchEvent(event);
    },
    description: 'Close panels',
    category: 'Navigation',
  },
  {
    key: 'Delete',
    action: () => {
      // Delete selected node
      const event = new CustomEvent('deleteSelected');
      window.dispatchEvent(event);
    },
    description: 'Delete selected node',
    category: 'Nodes',
  },
  {
    key: 'o',
    ctrl: true,
    action: () => {
      // Auto-organize
      const event = new CustomEvent('autoOrganize');
      window.dispatchEvent(event);
    },
    description: 'Auto-organize layout',
    category: 'Layout',
  },
];
