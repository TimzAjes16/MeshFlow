# MeshFlow

Visual knowledge mapping with AI-powered auto-linking and intelligent node organization.

## Features

- ✅ **Infinite Canvas** - Zoom, pan, and explore your knowledge map
- ✅ **Double-Click Node Creation** - Create nodes instantly with FloatingToolbar
- ✅ **Multiple Node Types** - Text, Note, Link, Image, Box, Circle
- ✅ **Rich Text Editor** - TipTap-powered editor with formatting toolbar and slash commands
- ✅ **Auto-Linking** - AI-powered semantic connections between related nodes
- ✅ **Smart Layouts** - Force-directed, Radial, Hierarchical, and Semantic clustering
- ✅ **Keyboard Shortcuts** - Power user shortcuts for fast navigation
- ✅ **Search & Zoom** - Find and navigate to nodes instantly
- ✅ **Workspace Management** - Create and organize multiple workspaces
- ✅ **Real-time Collaboration** - Share workspaces with team members
- ✅ **Empty State Onboarding** - Guided introduction for new users

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
1. **Create a Workspace**: Sign up, go to Dashboard, and click "New Workspace"
2. **Create Nodes**: **Double-click** anywhere on the canvas to open the FloatingToolbar and select a node type
3. **Edit Nodes**: Click a node to open the editor panel on the right with rich text editing
4. **Keyboard Shortcuts**: 
   - `Ctrl/Cmd+N` - Create new node
   - `Ctrl/Cmd+F` - Focus search
   - `Delete/Backspace` - Delete selected node
   - `Escape` - Close panels/deselect
5. **Search**: Use the search bar (top-left) to find and zoom to nodes
6. **Auto-Organize**: Click "Auto-Organize" button or press `Ctrl+O` to reorganize layout
7. **Layouts**: Switch between Force, Radial, Hierarchical, and Semantic cluster views

### Node Creation
- **Double-click canvas** → FloatingToolbar appears → Select node type (Text, Note, Link, Image, Box, Circle)
- **Keyboard**: Press `Ctrl/Cmd+N` → Toolbar appears at viewport center
- **Navigation**: Use arrow keys in toolbar, Enter to select, Escape to close

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
