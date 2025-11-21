# MeshFlow

Visual knowledge mapping with AI-powered auto-linking and intelligent node organization.

## Features

- ✅ **Infinite Canvas** - Zoom, pan, and explore your knowledge map with smooth interactions
- ✅ **Dashboard Graph View** - 2D force-directed graph visualization of all workspaces (Obsidian-style)
- ✅ **Interactive Minimap** - Real-time minimap that syncs with zoom/pan operations (accurate positioning)
- ✅ **Zoom Controls** - Zoom in (+), zoom out (-), and fit view ([]) buttons with minimap sync
- ✅ **Double-Click Node Creation** - Create nodes instantly with FloatingToolbar (Miro-style)
- ✅ **Multiple Node Types** - Text, Note, Link, Image, Box, Circle, Charts (Bar, Line, Pie, Area), Emoji, Arrow
- ✅ **Rich Text Editor** - TipTap-powered editor with formatting toolbar and slash commands (Notion-style)
- ✅ **Floating Formatting Toolbar** - Appears on text selection with formatting options
- ✅ **Slash Commands** - Notion-style quick actions menu (/)
- ✅ **Auto-Linking** - AI-powered semantic connections between related nodes (OpenAI embeddings)
- ✅ **Smart Layouts** - Force-directed, Radial, Hierarchical, and Semantic clustering with auto-organize
- ✅ **Keyboard Shortcuts** - Comprehensive shortcuts (Ctrl/Cmd+N, Ctrl/Cmd+F, Delete, Escape, Layer controls)
- ✅ **Node Resizing & Rotation** - Interactive resize handles and rotation controls for all node types
- ✅ **Layering Controls** - Bring to front, send to back, move forward/backward (Ctrl+]/[)
- ✅ **Search & Zoom** - Find and navigate to nodes instantly with fuzzy search
- ✅ **Workspace Management** - Create and organize multiple workspaces with sharing
- ✅ **Real-time Collaboration** - Share workspaces with team members, comments, activity feed
- ✅ **Empty State Onboarding** - Guided introduction for new users
- ✅ **Floating Node Editor** - Horizontal toolbar at bottom for node editing (Miro-style)

## Getting Started

For detailed setup instructions, see **[QUICKSTART.md](./QUICKSTART.md)**.

### Quick Setup

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database and environment variables:
```bash
npm run setup:full
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

📖 **Full setup guide**: See [QUICKSTART.md](./QUICKSTART.md) for complete instructions.

## Usage

### Quick Start
1. **Dashboard**: View all workspaces as an interactive 2D force-directed graph
2. **Create a Workspace**: Click "New Workspace" on the dashboard
3. **Create Nodes**: **Double-click** anywhere on the canvas to open the FloatingToolbar and select a node type
4. **Edit Nodes**: Click a node to open the editor panel on the right with rich text editing
5. **Zoom Controls**: Use the +, -, and [] buttons (bottom-left) to zoom in, zoom out, and fit view
6. **Minimap**: View your canvas overview in the bottom-right minimap (updates in real-time)
7. **Keyboard Shortcuts**: 
   - `Ctrl/Cmd+N` - Create new node
   - `Ctrl/Cmd+F` - Focus search
   - `Delete/Backspace` - Delete selected node
   - `Escape` - Close panels/deselect
   - `Ctrl/Cmd+]` - Bring node to front
   - `Ctrl/Cmd+[` - Send node to back
   - `Ctrl/Cmd+↑` - Move node forward
   - `Ctrl/Cmd+↓` - Move node backward
   - `Ctrl/Cmd+/` - Show all shortcuts
8. **Search**: Use the search bar (top-left) to find and zoom to nodes
9. **Auto-Organize**: Click "Auto-Organize" button or press `Ctrl+O` to reorganize layout
10. **Layouts**: Switch between Force, Radial, Hierarchical, and Semantic cluster views

### Node Creation
- **Double-click canvas** → FloatingToolbar appears → Select node type (Text, Note, Link, Image, Box, Circle, Charts, Emoji, Arrow)
- **Keyboard**: Press `Ctrl/Cmd+N` → Toolbar appears at viewport center
- **Navigation**: Use arrow keys in toolbar, Enter to select, Escape to close

### Node Editing
- **Click a node** → Floating horizontal editor bar appears at bottom
- **Resize nodes**: Drag resize handles on selected nodes (corners and edges)
- **Rotate nodes**: Drag the rotation handle above selected nodes
- **Layer nodes**: Use keyboard shortcuts or layer dropdown in editor bar
- **Text formatting**: Select text → Floating toolbar appears → Format or type `/` for commands

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Canvas**: React Flow
- **Layout**: D3.js force simulation
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **AI**: OpenAI Embeddings API (optional)
- **Styling**: Tailwind CSS

## Project Structure

```
MeshFlow/
├── app/                          # Next.js app directory
│   ├── api/                     # API routes (nodes, workspaces, search)
│   ├── workspace/               # Workspace pages
│   ├── dashboard/               # Dashboard page
│   └── auth/                    # Authentication pages
├── components/                  # React components
│   ├── CanvasContainer.tsx      # Main canvas with React Flow
│   ├── CanvasPageClient.tsx     # Canvas page orchestrator
│   ├── FloatingToolbar.tsx      # Node type selection toolbar
│   ├── NodeEditorPanel.tsx      # Rich text editor panel
│   ├── FloatingFormatToolbar.tsx # Text formatting toolbar
│   ├── SlashCommandMenu.tsx     # Notion-style slash commands
│   ├── EmptyState.tsx           # Onboarding empty state
│   ├── KeyboardShortcuts.tsx    # Shortcuts modal
│   └── WorkspaceTopNav.tsx      # Top navigation bar
├── lib/                         # Utilities
│   ├── db.ts                   # Prisma database client
│   ├── auth.ts                 # NextAuth configuration
│   ├── embeddings.ts           # AI/embeddings
│   ├── layoutEngine.ts         # Layout algorithms
│   └── useAutoOrganize.ts      # Auto-organize hook
├── state/                       # Zustand stores
│   ├── canvasStore.ts          # Canvas state
│   └── workspaceStore.ts       # Workspace state
├── prisma/                     # Prisma schema
└── types/                      # TypeScript types
```

## Roadmap

See the feature roadmap in the project documentation for MVP → V1 → Pro → Enterprise tiers.

## License

MIT
