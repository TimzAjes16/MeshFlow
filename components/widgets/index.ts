/**
 * Widget Registry
 * Central registry for all widget types
 * Similar to node registry but specifically for modular workspace widgets
 */

import IframeWidget from './IframeWidget';
import WebViewWidget from './WebViewWidget';
import LiveCaptureWidget from './LiveCaptureWidget';
import NativeWindowWidget from './NativeWindowWidget';

export const WIDGET_TYPES = {
  'iframe-widget': IframeWidget,
  'webview-widget': WebViewWidget,
  'live-capture-widget': LiveCaptureWidget,
  'native-window-widget': NativeWindowWidget,
} as const;

export type WidgetType = keyof typeof WIDGET_TYPES;

export { IframeWidget, WebViewWidget, LiveCaptureWidget, NativeWindowWidget };

