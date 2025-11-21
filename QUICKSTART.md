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

## ✨ Key Features to Try

### Create Your First Workspace
1. Sign up or log in at `/auth/signup` or `/auth/login`
2. Go to Dashboard and click **"New Workspace"**
3. Enter a workspace name and click **"Create"**

### Create Your First Node
1. **Double-click** anywhere on the canvas to create a node
2. Or click **"New Node"** button in the top bar
3. Enter a title and content in the editor panel
4. Add tags to organize your nodes

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
- **Drag nodes** to reposition them manually
- **Click nodes** to select and edit them
- **Double-click canvas** to create new nodes
- **Pan** by dragging the canvas background
- **Zoom** using mouse wheel or trackpad pinch
- **Press Ctrl+K** to open command palette with all shortcuts

### Keyboard Shortcuts
- **Ctrl+N** - Create new node
- **Ctrl+F** - Focus search bar
- **Ctrl+K** - Open command palette
- **Ctrl+O** - Auto-organize layout
- **Delete** - Delete selected node
- **Escape** - Close panels/deselect

### Auto-Features
- Nodes are **auto-saved** when you edit them
- Connections are **auto-created** based on similarity
- Layout **auto-organizes** on load
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
- Try `lsof -ti:3000 | xargs kill` to free the port
- Make sure Node.js 18+ is installed

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
- Double-click on the canvas to create a node
- Click "New Node" button in the top bar

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

