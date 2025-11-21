# MeshFlow

Visual knowledge mapping with AI-powered auto-linking.

## Features (MVP)

- ✅ Create/edit nodes
- ✅ Infinite canvas
- ✅ Basic force-directed layout
- ✅ Auto-linking via embeddings
- ✅ Search → highlight node
- ✅ Workspace creation
- ✅ Basic sharing (database structure ready)

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

1. **Create a Workspace**: Click "New Workspace" on the home page and enter a name
2. **Add Nodes**: Right-click on the canvas to create a new node (enter a title when prompted)
3. **Edit Nodes**: Click on a node to open the editor panel on the right
4. **Connect Nodes**: Drag from one node's handle (bottom) to another node's handle (top) to create a connection
5. **Auto-Link**: Toggle "Auto-Link" button to automatically connect similar nodes via AI embeddings when creating/editing nodes
6. **Search**: Use the search bar to find and highlight matching nodes
7. **Layout**: Click "Layout" button to run the force-directed layout algorithm and reorganize nodes
8. **Navigate**: Use the back arrow to return to the workspace list

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
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── workspace/         # Workspace pages
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Canvas.tsx         # Main canvas component
│   ├── NodeEditor.tsx     # Node editing UI
│   ├── SearchBar.tsx      # Search functionality
│   └── WorkspaceList.tsx  # Workspace list
├── lib/                   # Utilities
│   ├── db.ts             # Prisma database client
│   ├── auth.ts           # NextAuth configuration
│   ├── embeddings.ts     # AI/embeddings
│   └── layoutEngine.ts   # Layout algorithms
├── prisma/               # Prisma schema
└── types/                # TypeScript types
```

## Roadmap

See the feature roadmap in the project documentation for MVP → V1 → Pro → Enterprise tiers.

## License

MIT
