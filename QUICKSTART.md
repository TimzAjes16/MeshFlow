# MeshFlow Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. (Optional) Add OpenAI API Key
Create `backend/.env`:
```
PORT=3001
OPENAI_API_KEY=your_key_here
NODE_ENV=development
```

**Note**: MeshFlow works without OpenAI! It uses intelligent fallback algorithms.

### 3. Start the App
```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

## ✨ Key Features to Try

### Create Your First Note
1. Click **"New Note"** in the toolbar
2. Write some content
3. Click **"Find Related Notes"** to see AI suggestions

### Explore Layout Modes
Switch between 5 different layouts:
- **Force** - Natural physics-based layout
- **Radial** - Circular arrangement
- **Hierarchy** - Top-down tree structure
- **Linear** - Sequential arrangement
- **Mind Map** - Central node with branches

### Use Explode Mode
- **Double-click** any node to focus on it and its connections
- Click the **X** in the toolbar to exit explode mode

### Search & Filter
- Use the **search icon** to find nodes by content
- Click the **filter icon** to hide old or low-importance nodes

### Connect Ideas
- When editing a note, click **"Find Related Notes"**
- Review AI suggestions and click the **link icon** to connect

## 🎯 Tips

- **Drag nodes** to reposition them
- **Click nodes** to edit them
- **Double-click nodes** to explode into them
- Notes are **auto-saved** to localStorage
- The graph **auto-organizes** as you add connections

## 🛠️ Troubleshooting

**Backend won't start?**
- Make sure port 3001 is available
- Check that Node.js 18+ is installed

**AI features not working?**
- Check your OpenAI API key in `backend/.env`
- Or use the app without it - fallback algorithms work great!

**Graph looks empty?**
- Create your first note using the welcome screen
- Or click "New Note" in the toolbar

## 📚 Next Steps

- Add more notes and watch them connect
- Try different layout modes to see your knowledge from new angles
- Use filters to focus on recent or important ideas
- Explore the graph by dragging and zooming

Happy organizing! 🎨

