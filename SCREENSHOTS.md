# Screenshots Guide

This guide explains how to take screenshots for the MeshFlow landing page.

## Prerequisites

1. Ensure you have a `.env.local` file with `DATABASE_URL` set (run `npm run setup:env` if needed)
2. Make sure your database is set up and running
3. Create a test user account (or use an existing one)
4. Run the test workspace generation script to create a populated workspace

## Generating Test Data

1. Update the `TEST_USER_EMAIL` in `scripts/generate-test-workspace.ts` with your test user's email
2. Run the script:
   ```bash
   npx tsx scripts/generate-test-workspace.ts
   ```
3. This will create a workspace with 20 nodes of various types (text, note, box, circle) and connections between them
4. The script will output the workspace ID - use this to navigate to `/workspace/[workspace-id]/canvas`

## Screenshots Needed

### 1. Hero Section Screenshot
**Location:** Main hero section of landing page
**What to capture:**
- A workspace canvas showing multiple nodes and connections
- Should showcase the visual knowledge graph
- Include various node types (text, note, box, circle)
- Show connections/edges between nodes
- Make it visually appealing and representative of the product

**How to take:**
1. Navigate to `/workspace/[workspace-id]/canvas`
2. Arrange nodes in an aesthetically pleasing layout
3. Ensure good zoom level (not too zoomed in/out)
4. Take a full-screen or large screenshot
5. Save as `public/screenshots/hero-workspace.png`

### 2. Links Feature Screenshot
**Location:** "Links" section in "Spark ideas"
**What to capture:**
- A node being edited with link suggestions showing
- Show the autocomplete/suggestion dropdown
- Demonstrate the linking functionality

**How to take:**
1. Click on a text node
2. Type `[[` to trigger link suggestions
3. Capture the node editor with suggestions visible
4. Save as `public/screenshots/links-feature.png`

### 3. Graph View Screenshot
**Location:** "Graph" section in "Spark ideas"
**What to capture:**
- The graph visualization showing nodes and connections
- Multiple nodes clustered or connected
- Should look like a knowledge graph

**How to take:**
1. Navigate to the dashboard (`/dashboard`)
2. The workspace graph should show multiple nodes
3. Take a screenshot of the graph view
4. Save as `public/screenshots/graph-view.png`

### 4. Canvas Feature Screenshot
**Location:** "Canvas" section in "Spark ideas"
**What to capture:**
- The full canvas with various node types
- Show different node types (text, note, box, circle, emoji, arrow)
- Include connections between nodes
- Show the floating toolbar and sidebar

**How to take:**
1. Navigate to `/workspace/[workspace-id]/canvas`
2. Create nodes of different types
3. Arrange them nicely on the canvas
4. Ensure the UI elements (toolbar, sidebar) are visible
5. Take a full screenshot
6. Save as `public/screenshots/canvas-feature.png`

### 5. Sync Settings Screenshot
**Location:** "Sync securely" section
**What to capture:**
- Settings page or sync-related UI
- Show sync options and controls

**How to take:**
1. Navigate to `/settings`
2. Take a screenshot of the settings page
3. Save as `public/screenshots/sync-settings.png`

## Replacing Placeholders

After taking screenshots, update the landing page (`app/page.tsx`) to use the actual images:

1. Place screenshots in `public/screenshots/` directory
2. Replace placeholder divs with Next.js Image components:

```tsx
import Image from 'next/image';

// Replace placeholder with:
<Image
  src="/screenshots/hero-workspace.png"
  alt="MeshFlow workspace"
  width={1200}
  height={675}
  className="rounded-2xl"
  priority
/>
```

## Tips

- Use a consistent browser window size for all screenshots
- Ensure good contrast and visibility
- Remove any personal/sensitive data from screenshots
- Consider using a dark theme for consistency with the landing page
- Make sure nodes are clearly visible and connections are apparent
- Use high-resolution screenshots (at least 1920x1080)

## Current Placeholders

The landing page currently uses placeholder divs with:
- Gradient backgrounds
- Logo placeholders
- Text indicating what screenshot should replace it

These should all be replaced with actual screenshots once available.

