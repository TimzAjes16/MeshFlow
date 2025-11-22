# MeshFlow Quick Start Guide

## 🚀 Getting Started in 4 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up PostgreSQL Database

**Install PostgreSQL 15+ on your system:**
- **macOS**: `brew install postgresql@15` or download from [PostgreSQL.org](https://www.postgresql.org/download/)
- **Linux**: `sudo apt-get install postgresql-15 postgresql-contrib` (Ubuntu/Debian) or use your package manager
- **Windows**: Download installer from [PostgreSQL.org](https://www.postgresql.org/download/windows/)

**Install pgvector extension:**
- **macOS**: `brew install pgvector`
- **Linux**: Follow instructions at [pgvector GitHub](https://github.com/pgvector/pgvector)
- **Windows**: Follow instructions at [pgvector GitHub](https://github.com/pgvector/pgvector)

**Create database and enable extension:**
```bash
# Start PostgreSQL (if not already running)
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql

# Connect to PostgreSQL
psql postgres

# In PostgreSQL prompt:
CREATE DATABASE meshflow;
\c meshflow
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 3. Set Up Environment Variables
Create `.env.local` in the root directory:
```bash
cp .env.example .env.local
```

Then add your configuration (update with your PostgreSQL credentials):
```env
# Database (Required)
# Update username, password, and database name as needed
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/meshflow"

# NextAuth.js (Required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"

# OpenAI (Optional - for auto-linking)
OPENAI_API_KEY=your_openai_api_key

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

**Note**: MeshFlow can work without OpenAI! Auto-linking uses intelligent fallback algorithms.

### 4. Generate Prisma Client and Run Migrations
```bash
# Generate Prisma Client
npm run db:generate

# Run database migrations
npm run db:migrate
```

Or for development (pushes schema directly):
```bash
npm run db:push
```

### 5. Start the Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` 🎉

### 6. Stop the Development Server

**Method 1: Keyboard shortcut (easiest)**
- In the terminal where `npm run dev` is running, press **Ctrl+C** (or **Cmd+C** on Mac)
- The server will stop gracefully

**Method 2: Kill process by port**
If the terminal is closed or Ctrl+C doesn't work, kill the process using the port:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or kill all Next.js processes
pkill -f "next dev"
```

**Method 3: Find and kill process manually**
```bash
# Find the process
lsof -i:3000

# Kill using the PID shown above
kill -9 <PID>
```

**Note**: If port 3000 is still in use after stopping, use Method 2 or 3 to force kill the process.

## ✨ Key Features to Try

### Dashboard Graph View
1. After logging in, you'll see the **Dashboard** with all your workspaces
2. Workspaces are displayed as an **interactive 2D force-directed graph** (similar to Obsidian's graph view)
3. **Click any workspace node** to open it
4. **Search workspaces** using the search bar - matching workspaces are highlighted in orange
5. **Drag workspace nodes** to reposition them in the graph
6. **Zoom and pan** the dashboard graph to explore your workspaces

### Create Your First Workspace
1. On the Dashboard, click **"New Workspace"**
2. Enter a workspace name and click **"Create"**
3. You'll be taken to the canvas view

### Create Your First Node
1. **Double-click** anywhere on the canvas to open the FloatingToolbar
2. Select a node type from the toolbar (Text, Note, Link, Image, Box, Circle)
3. Or press **Ctrl/Cmd+N** to show the toolbar at the viewport center
4. The new node will appear and auto-select
5. Enter a title and content in the editor panel on the right
6. Add tags to organize your nodes
7. Use the rich text editor with formatting toolbar and slash commands (`/`)

### Auto-Linking
- When you create or update a node, MeshFlow automatically:
  - Generates embeddings using OpenAI
  - Finds similar nodes based on content
  - Creates connections above similarity threshold (0.82)
  - Suggests links for similar content (0.65+)

### Explore Layout Modes
Switch between 4 different layouts in the top bar:
- **Force Directed** - Natural physics-based layout (default)
- **Radial** - Circular arrangement around center node
- **Hierarchical** - Top-down tree structure
- **Semantic Clusters** - Nodes grouped by similarity

### Auto-Organize
- Click **"Auto-Organize"** button (top-right of canvas)
- Or press **Ctrl+O** to reorganize your graph layout

### Zoom Controls & Minimap
- **Zoom In (+)**: Click the + button (bottom-left) to zoom in
- **Zoom Out (-)**: Click the - button (bottom-left) to zoom out
- **Fit View ([])**: Click the [] button (bottom-left) to fit all nodes in view
- **Minimap**: View your canvas overview in the bottom-right minimap
  - The minimap updates in real-time as you zoom, pan, or use controls
  - Click and drag on the minimap to pan the canvas
  - The highlighted area shows your current viewport

### Search & Navigate
- Use the **search bar** (top-left) to find nodes
- Click a search result to zoom to that node
- Press **Ctrl+F** to focus search bar
- Press **Ctrl+K** to open command palette

### Collaboration Features
- Click workspace name to open **Sharing Panel**
- Invite members via email with roles (editor/viewer)
- View **Activity Feed** to see recent changes
- Add **Comments** to nodes for team discussion

## 🎯 Tips

### Navigation
- **Double-click canvas** to create new nodes (opens FloatingToolbar)
- **Click nodes** to select and edit them in the right panel
- **Drag nodes** to reposition them manually
- **Pan** by dragging the canvas background
- **Zoom** using mouse wheel or trackpad pinch
- **FloatingToolbar** - Appears on double-click with 6 node types
- **Rich Text Editor** - Formatting toolbar appears when selecting text
- **Slash Commands** - Type `/` in editor for quick actions (Notion-style)
- **Press Ctrl+/** to see all keyboard shortcuts

### Keyboard Shortcuts
- **Double-click** - Create new node (opens FloatingToolbar)
- **Ctrl/Cmd+N** - Create new node (shows toolbar at center)
- **Ctrl/Cmd+F** - Focus search bar
- **Ctrl/Cmd+K** - Open command palette
- **Ctrl/Cmd+/** - Show keyboard shortcuts modal
- **Delete/Backspace** - Delete selected node
- **Escape** - Close panels/deselect node/close toolbar
- **Arrow Keys** - Navigate FloatingToolbar options
- **Enter/Space** - Select node type from toolbar

### Auto-Features
- Nodes are **auto-saved** when you edit them (title on blur, content on change)
- New nodes **auto-select** after creation with title field focused
- Empty state **auto-dismisses** when first node is created
- Connections are **auto-created** based on similarity (when OpenAI API key is set)
- Layout **auto-organizes** on initial load
- Changes **sync in real-time** across collaborators

## 🛠️ Troubleshooting

### Setup Issues

**npm install fails?**
- Make sure Node.js 18+ is installed: `node --version`
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Environment variables missing?**
- Create `.env.local` file in root directory
- Copy from `.env.example`
- Make sure DATABASE_URL and NEXTAUTH_SECRET are set (required)

**Database connection fails?**
- Verify DATABASE_URL in `.env.local` is correct
- Check that PostgreSQL is running:
  - macOS: `brew services list | grep postgresql`
  - Linux: `sudo systemctl status postgresql`
  - Windows: Check Services for PostgreSQL
- Ensure `pgvector` extension is enabled: `psql meshflow -c "CREATE EXTENSION IF NOT EXISTS vector;"`
- Try connecting with: `psql $DATABASE_URL` or `psql -d meshflow`
- Make sure PostgreSQL is listening on localhost:5432

**Development server won't start?**
- Check that port 3000 is available
- Try `lsof -ti:3000 | xargs kill -9` to free the port (force kill)
- Or use `pkill -f "next dev"` to kill all Next.js dev processes
- Make sure Node.js 18+ is installed

**Need to stop the dev server?**
- Press **Ctrl+C** (or **Cmd+C** on Mac) in the terminal running `npm run dev`
- Or use `lsof -ti:3000 | xargs kill -9` to force kill if terminal is closed

**Build errors (e.g., "Cannot find module './1682.js'")?**
- This is typically a Next.js webpack chunk cache issue
- Stop the dev server (press **Ctrl+C** or **Cmd+C**)
- Remove the corrupted build cache: `rm -rf .next`
- Start fresh: `npm run dev`
- The expand and rotate functionality should now work on all node types after the rebuild completes

### Feature Issues

**Auto-linking not working?**
- Check your OpenAI API key in `.env.local`
- Or use the app without it - nodes will still work, just no auto-links
- Verify OPENAI_API_KEY is set correctly

**Real-time updates not syncing?**
- Check Supabase Realtime is enabled in your project
- Verify RLS policies allow read access
- Check browser console for connection errors

**Canvas looks empty?**
- Create your first workspace from the dashboard
- You'll see an onboarding message - click "Got it" to dismiss
- **Double-click** anywhere on the canvas to open the FloatingToolbar
- Select a node type (Text, Note, Link, Image, Box, or Circle)
- Or press **Ctrl/Cmd+N** to show the toolbar
- The empty state will automatically dismiss when you create your first node

**Search not finding nodes?**
- Make sure nodes have content (title or text)
- Try different search terms
- Check that search is running in the correct workspace

## 📚 Next Steps

1. **Create Multiple Nodes**
   - Add 5-10 nodes with different topics
   - Watch them auto-connect based on similarity

2. **Try Different Layouts**
   - Switch between Force, Radial, Hierarchical, and Semantic
   - See your knowledge from new visual angles

3. **Collaborate**
   - Invite team members to your workspace
   - Use comments to discuss ideas
   - Check activity feed for recent changes

4. **Export Your Work**
   - Export workspace as JSON or Markdown
   - Import from other formats
   - Back up your knowledge maps

5. **Explore Advanced Features**
   - Use keyboard shortcuts for power users
   - Set up saved searches
   - Create layout presets
   - Add spatial bookmarks

## 📖 Additional Resources

- **Development Log**: See `DEVELOPMENT.md` for full feature list
- **Global Map View**: See `GLOBAL_MAP_VIEW.md` for visualization details
- **GitHub Setup**: See `GITHUB_SETUP.md` for repository information
- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md` for completed features

## 🔗 Quick Links

- **Dashboard**: `/dashboard`
- **Login**: `/auth/login`
- **Sign Up**: `/auth/signup`

Happy organizing! 🎨

