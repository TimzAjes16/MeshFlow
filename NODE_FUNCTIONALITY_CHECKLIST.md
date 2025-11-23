# Node Functionality Checklist

## Node Types and Required Functionality

### 1. Text Node (`text`)
- ✅ **Creation**: Creates with empty text content
- ✅ **Content Structure**: `{ type: 'text', text: '' }`
- ✅ **Rendering**: Displays text with inline editing
- ✅ **Editing**: Single click to edit, supports text formatting (size, font, alignment)
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Text Block"

### 2. Note Node (`note`)
- ✅ **Creation**: Creates with empty markdown body
- ✅ **Content Structure**: `{ type: 'note', title: 'New Note', body: { type: 'doc', content: [{ type: 'paragraph' }] } }`
- ✅ **Rendering**: Displays note with title and TipTap editor body
- ✅ **Editing**: Title and body are editable
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "New Note"

### 3. Link Node (`link`)
- ✅ **Creation**: Creates with empty URL
- ✅ **Content Structure**: `{ type: 'link', url: '', preview: true }`
- ✅ **Rendering**: Displays link preview or URL input
- ✅ **Editing**: URL can be edited, preview toggle
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Link"

### 4. Image Node (`image`)
- ✅ **Creation**: Creates with empty image URL
- ✅ **Content Structure**: `{ type: 'image', url: '', size: 'medium', alignment: 'center' }`
- ✅ **Rendering**: Displays image or placeholder
- ✅ **Editing**: URL upload, size options, alignment
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Image"

### 5. Box Node (`box`)
- ✅ **Creation**: Creates with default fill and border
- ✅ **Content Structure**: `{ type: 'box', fill: true, fillColor: '#ffffff', borderColor: '#000000', borderWidth: 1 }`
- ✅ **Rendering**: Displays rectangular box shape
- ✅ **Editing**: Fill color, border color, border width
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Box"

### 6. Circle Node (`circle`)
- ✅ **Creation**: Creates with default fill and border
- ✅ **Content Structure**: `{ type: 'circle', fill: true, fillColor: '#ffffff', borderColor: '#000000', borderWidth: 1 }`
- ✅ **Rendering**: Displays circular shape
- ✅ **Editing**: Fill color, border color, border width
- ✅ **Resize**: Can be resized with handles (maintains aspect ratio)
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Circle"

### 7. Arrow Node (`arrow`)
- ✅ **Creation**: Creates with default direction and color
- ✅ **Content Structure**: `{ type: 'arrow', direction: 'right', color: '#000000' }`
- ✅ **Rendering**: Displays arrow icon in specified direction
- ✅ **Editing**: Direction (up, right, down, left), color
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Arrow"

### 8. Emoji Node (`emoji`)
- ✅ **Creation**: Creates with default emoji
- ✅ **Content Structure**: `{ type: 'emoji', emoji: '😀' }`
- ✅ **Rendering**: Displays emoji with optional fill/background
- ✅ **Editing**: Emoji picker, fill/no-fill, fill color
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Emoji"

### 9. Bar Chart Node (`bar-chart`)
- ✅ **Creation**: Creates with default chart data
- ✅ **Content Structure**: `{ type: 'bar-chart', data: { labels: [], datasets: [] } }`
- ✅ **Rendering**: Displays bar chart visualization
- ✅ **Editing**: Chart editor panel with data input
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Bar Chart"

### 10. Line Chart Node (`line-chart`)
- ✅ **Creation**: Creates with default chart data
- ✅ **Content Structure**: `{ type: 'line-chart', data: { labels: [], datasets: [] } }`
- ✅ **Rendering**: Displays line chart visualization
- ✅ **Editing**: Chart editor panel with data input
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Line Chart"

### 11. Pie Chart Node (`pie-chart`)
- ✅ **Creation**: Creates with default chart data
- ✅ **Content Structure**: `{ type: 'pie-chart', data: { labels: [], datasets: [] } }`
- ✅ **Rendering**: Displays pie chart visualization
- ✅ **Editing**: Chart editor panel with data input
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Pie Chart"

### 12. Area Chart Node (`area-chart`)
- ✅ **Creation**: Creates with default chart data
- ✅ **Content Structure**: `{ type: 'area-chart', data: { labels: [], datasets: [] } }`
- ✅ **Rendering**: Displays area chart visualization
- ✅ **Editing**: Chart editor panel with data input
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Area Chart"

### 13. Live Capture Node (`live-capture`)
- ✅ **Creation**: Creates with capture mode (fullscreen/custom)
- ✅ **Content Structure**: `{ type: 'live-capture', imageUrl: '', cropArea: {}, captureHistory: [] }`
- ✅ **Rendering**: Displays captured screenshot/image
- ✅ **Editing**: Capture new image, view history
- ✅ **Resize**: Can be resized with handles
- ✅ **Rotate**: Can be rotated with handle
- ✅ **Default Title**: "Live Capture"

## Common Functionality (All Nodes)
- ✅ **Selection**: Single click selects node, shows FloatingNodeEditor
- ✅ **Deletion**: Delete button in editor or Delete key
- ✅ **Duplication**: Duplicate button in editor
- ✅ **Layering**: Bring to front, move forward, move backward, send to back
- ✅ **Tags**: Can add/remove tags
- ✅ **Linked Nodes**: Can link to other nodes
- ✅ **AI Actions**: Summarize, expand, rewrite, brainstorm (stubs)

## Horizontal Bar Requirements
- ✅ **Positioning**: Centered horizontally on canvas (not screen), pinned to bottom
- ✅ **Draggable**: Can be dragged but snaps back to center
- ✅ **Node Creation Mode**: Shows when no node selected
- ✅ **Node Edit Mode**: Shows when node selected (replaced by FloatingNodeEditor)
- ✅ **Grouped Menus**: Shapes and Charts in dropdown menus
- ✅ **Live Capture Menu**: Fullscreen and Custom Area options



