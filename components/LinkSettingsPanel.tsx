'use client';

import { useState, useEffect, useRef } from 'react';
import { ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { Node } from '@/types/Node';

interface LinkConfig {
  url?: string;
  title?: string;
  description?: string;
  preview?: boolean;
}

interface LinkSettingsPanelProps {
  node: Node;
  onUpdate: (config: LinkConfig) => void;
}

// Simple URL validation
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Normalize URL (add https:// if no protocol)
function normalizeUrl(url: string): string {
  if (!url) return '';
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

export default function LinkSettingsPanel({ node, onUpdate }: LinkSettingsPanelProps) {
  const getLinkConfig = (): LinkConfig => {
    if (node.content && typeof node.content === 'object' && 'link' in node.content) {
      return (node.content as any).link;
    }
    // Fallback: try to extract URL from content string
    if (typeof node.content === 'string' && node.content.trim()) {
      return { url: node.content.trim() };
    }
    return { url: '', preview: true };
  };

  const linkConfig = getLinkConfig();

  const [url, setUrl] = useState<string>(linkConfig.url || '');
  const [title, setTitle] = useState<string>(linkConfig.title || '');
  const [description, setDescription] = useState<string>(linkConfig.description || '');
  const [preview, setPreview] = useState<boolean>(linkConfig.preview !== false);
  const [isValid, setIsValid] = useState<boolean>(url ? isValidUrl(normalizeUrl(url)) : false);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const isInitialMount = useRef(true);
  const skipNextUpdate = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  // Update ref when onUpdate changes
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync with node content changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }

    const newConfig = getLinkConfig();
    if (newConfig.url !== url || newConfig.title !== title || newConfig.description !== description) {
      setUrl(newConfig.url || '');
      setTitle(newConfig.title || '');
      setDescription(newConfig.description || '');
      setPreview(newConfig.preview !== false);
    }
  }, [node.content]);

  // Validate URL on change
  useEffect(() => {
    if (!url.trim()) {
      setIsValid(false);
      return;
    }

    const normalized = normalizeUrl(url);
    const valid = isValidUrl(normalized);
    setIsValid(valid);

    // Auto-update if URL is valid
    if (valid && !skipNextUpdate.current) {
      skipNextUpdate.current = true;
      onUpdateRef.current({
        url: normalized,
        title,
        description,
        preview,
      });
    }
  }, [url, title, description, preview]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setIsValidating(true);
    
    // Debounce validation
    setTimeout(() => {
      setIsValidating(false);
    }, 500);
  };

  const handleTestLink = () => {
    if (isValid && url) {
      const normalized = normalizeUrl(url);
      window.open(normalized, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          URL
        </label>
        <div className="relative">
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              url && !isValidating
                ? isValid
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {url && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidating ? (
                <Loader2 className="w-4 h-4 text-black animate-spin" />
              ) : isValid ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          )}
        </div>
        {url && !isValid && !isValidating && (
          <p className="mt-1 text-xs text-red-600">
            Please enter a valid URL (e.g., https://example.com)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            skipNextUpdate.current = true;
            onUpdateRef.current({
              url: url ? normalizeUrl(url) : '',
              title: e.target.value,
              description,
              preview,
            });
          }}
          placeholder="Link title"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            skipNextUpdate.current = true;
            onUpdateRef.current({
              url: url ? normalizeUrl(url) : '',
              title,
              description: e.target.value,
              preview,
            });
          }}
          placeholder="Link description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="link-preview"
          checked={preview}
          onChange={(e) => {
            setPreview(e.target.checked);
            skipNextUpdate.current = true;
            onUpdateRef.current({
              url: url ? normalizeUrl(url) : '',
              title,
              description,
              preview: e.target.checked,
            });
          }}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="link-preview" className="text-sm text-black">
          Show preview
        </label>
      </div>

      {isValid && url && (
        <button
          onClick={handleTestLink}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Test Link
        </button>
      )}
    </div>
  );
}

