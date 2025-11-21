# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Floating Horizontal Bar for Node Creation and Editing - 2024

**Feature:**
- Added floating horizontal bar at the bottom center of the canvas
- Replaces double-click functionality for node creation
- Shows node creation options (Text, Note, Link, Image, Box, Circle, Charts) when expanded
- Automatically switches to node edit mode when a node is selected
- Edit mode shows quick actions: Duplicate, Delete, Close
- Collapsible/expandable design for better canvas space management

**Implementation:**
- Created `FloatingHorizontalBar.tsx` component
- Single click on canvas background shows creation toolbar
- Clicking a node switches bar to edit mode
- Integrated with existing node creation and editing workflows

#### Collapsible Left Sidebar for Nodes List - 2024

**Feature:**
- Moved "All Nodes" list from bottom panel to left sidebar
- Collapsible sidebar with smooth animations
- Shows nodes grouped by tags with "Recently Visited" section
- Toggle button to expand/collapse (320px expanded, 48px collapsed)
- Preserves all functionality: node selection, scrolling to nodes, tag filtering

**Implementation:**
- Created `CanvasSidebar.tsx` component
- Updated `CanvasPageClient.tsx` layout structure
- Sidebar → Canvas → Right Panel (Editor) layout

#### Unique Node Shapes on Canvas - 2024

**Feature:**
- Box nodes render as actual rectangles with sharp corners
- Circle nodes render as perfect circles
- Note nodes render as sticky notes with folded corner effect
- Link nodes render as bookmark shapes with clipped corner
- Text nodes render with markdown-style formatting support
- Image nodes show actual image previews
- Chart nodes show actual charts (unchanged)

**Implementation:**
- Updated `NodeComponent.tsx` to render actual content instead of node representations
- Each node type has unique visual identity while maintaining functionality
- Content displays directly on canvas for better visibility

### Fixed

#### Refresh Loop Issue in Node Editor - 2024

**Problem:**
Every node update in `NodeEditorPanel` dispatched a `refreshWorkspace` event, which:
- Triggered `WorkspaceProvider` to reload workspace data
- Updated the store, causing re-renders
- Created an infinite refresh loop

**Solution:**
Removed all `window.dispatchEvent(new CustomEvent('refreshWorkspace'))` calls from update operations in `NodeEditorPanel.tsx`.

**How it works now:**
- **Optimistic updates:** Changes update the local store immediately for instant UI feedback
- **Debounced API calls:** Changes are persisted to the database after 500ms of inactivity (to avoid excessive API calls)
- **No refresh events:** Removed `refreshWorkspace` dispatches that caused the loop
- **Polling sync:** `WorkspaceProvider` polls every 5 seconds to sync any changes from other sources

**Changes persist in real-time:**
- User edits title → store updates immediately → UI updates instantly
- User edits content → store updates immediately → UI updates instantly
- Debounced API call saves to database after 500ms
- Changes persist across page refreshes
- No refresh loop

**What was changed:**
- Removed 12 `refreshWorkspace` dispatches from update operations:
  - Title updates
  - Content updates
  - Tag updates
  - Image settings updates
  - Chart settings updates
  - Shape settings updates
  - Text settings updates

**Files modified:**
- `components/NodeEditorPanel.tsx` - Removed all `refreshWorkspace` event dispatches from update operations

**Action taken:**
1. Identified the root cause: every update operation was dispatching `refreshWorkspace` events
2. Analyzed the refresh loop mechanism:
   - `refreshWorkspace` event → `WorkspaceProvider` reloads → store updates → component re-renders → loop continues
3. Implemented fix by removing unnecessary `refreshWorkspace` dispatches
4. Leveraged existing optimistic update pattern for instant UI feedback
5. Relying on existing polling mechanism (5-second interval) for cross-client sync
6. Verified that debounced API calls (500ms) prevent excessive database writes while maintaining persistence

**Testing:**
- ✅ Node editor updates persist immediately without refresh loop
- ✅ Changes save to database after 500ms debounce
- ✅ No infinite re-renders or refresh cycles
- ✅ Changes persist across page refreshes
- ✅ Cross-client sync still works via polling mechanism

**Result:**
The refresh loop is fixed, and changes persist in real-time without excessive refreshing. The node editor now provides a smooth, responsive editing experience with immediate visual feedback and reliable data persistence.

#### Drag-to-Connect Functionality - 2024

**Problem:**
- Drag-to-connect didn't work when zoomed out
- Fixed pixel-based overlap detection didn't account for zoom levels
- Nodes out of viewport couldn't be connected

**Solution:**
- Updated `onNodeDragStop` to use DOM element dimensions and viewport zoom
- Converts screen dimensions to flow coordinates for accurate overlap detection
- Works at any zoom level by calculating actual node sizes in flow space

**Files modified:**
- `components/CanvasContainer.tsx` - Improved drag-to-connect detection logic

#### Canvas Panning - 2024

**Problem:**
- Canvas dragging/panning was not working smoothly
- Panning only worked with specific mouse buttons

**Solution:**
- Changed `panOnDrag` from `[1, 2]` to `true` for left mouse button panning
- Added `panOnScroll={true}` for scroll wheel panning with modifier keys
- Panning now works smoothly on empty canvas space

**Files modified:**
- `components/CanvasContainer.tsx` - Updated pan and drag configuration

#### Node Edit Settings Buttons - 2024

**Problem:**
- Size and color buttons in settings panels sometimes didn't update nodes
- Changes weren't being applied in real-time

**Solution:**
- Fixed `useEffect` dependencies in `ImageSettingsPanel.tsx`, `TextSettingsPanel.tsx`, and `ChartEditorPanel.tsx`
- Ensured complete config objects are passed to `onUpdate` callbacks
- Added proper state synchronization to prevent stale closures

**Files modified:**
- `components/ImageSettingsPanel.tsx` - Fixed size/alignment/borderRadius updates
- `components/TextSettingsPanel.tsx` - Fixed fontSize/fontFamily/alignment updates
- `components/ChartEditorPanel.tsx` - Fixed size/colorPreset updates

