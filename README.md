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

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Add your OpenAI API key (optional, will use fallback if not set):
```
OPENAI_API_KEY=your_key_here
```

3. Run database migrations:
```bash
npm run db:migrate
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Create a Workspace**: Click "New Workspace" on the home page
2. **Add Nodes**: Right-click on the canvas to create a new node
3. **Edit Nodes**: Click on a node to open the editor
4. **Connect Nodes**: Drag from one node to another to create a connection
5. **Auto-Link**: Enable "Auto-Link" to automatically connect similar nodes via AI embeddings
6. **Search**: Use the search bar to find and highlight nodes
7. **Layout**: Click "Layout" to run the force-directed layout algorithm

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Canvas**: React Flow
- **Layout**: D3.js force simulation
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI Embeddings API (with fallback)
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
│   ├── db.ts             # Database setup
│   ├── ai.ts             # AI/embeddings
│   ├── layout.ts         # Layout algorithms
│   └── types.ts          # TypeScript types
└── data/                  # SQLite database (gitignored)
```

## Roadmap

See the feature roadmap in the project documentation for MVP → V1 → Pro → Enterprise tiers.

## License

MIT
