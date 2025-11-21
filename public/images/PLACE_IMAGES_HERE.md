# Image Assets for MeshFlow

## Where to Place Your Images

Place your images in this `/public/images/` directory. They will be accessible at `/images/your-image.png`.

## Recommended Images

### 1. Hero Section Image
- **Filename**: `hero-graph.png` or `hero-graph.jpg`
- **Location**: `/public/images/hero-graph.png`
- **Usage**: Main hero section on home page
- **Recommended Size**: 1920x1080px or larger
- **Description**: Should show a visual representation of the knowledge graph/mapping concept

### 2. Features Section Image
- **Filename**: `features.png` or `features.jpg`
- **Location**: `/public/images/features.png`
- **Usage**: Features section showing MeshFlow capabilities
- **Recommended Size**: 1024x1024px or larger
- **Description**: Visual showing key features like auto-linking, layouts, collaboration

### 3. Logo (if separate)
- **Filename**: `logo.png` or `logo.svg`
- **Location**: `/public/images/logo.png`
- **Usage**: Branding throughout the site
- **Recommended Format**: SVG (vector) or PNG with transparency

### 4. Screenshots/Demos
- **Filename**: `screenshot-*.png` or `demo-*.png`
- **Location**: `/public/images/screenshot-*.png`
- **Usage**: Product screenshots or demo visuals
- **Recommended Size**: Match the display size (typically 1200-1600px width)

## How Images Are Referenced

Once you place images in `/public/images/`, reference them in your code like this:

### Using Regular img tag:
```tsx
<img src="/images/hero-graph.png" alt="MeshFlow Knowledge Graph" />
```

### Using Next.js Image component (recommended):
```tsx
import Image from 'next/image';

<Image 
  src="/images/hero-graph.png" 
  alt="MeshFlow Knowledge Graph"
  width={1920}
  height={1080}
  priority // For above-the-fold images
  className="rounded-2xl"
/>
```

## Current Placeholders

The home page (`app/page.tsx`) currently has placeholder sections for:
1. Hero image - around line 120-130
2. Features image - around line 220-230

Search for `{/* Placeholder for hero image */}` and `{/* Placeholder for feature image */}` to replace with your images.

## Image Optimization Tips

1. **Format**: Use PNG for images with transparency, JPG for photos, WebP for best compression
2. **Size**: Optimize images before uploading (use tools like TinyPNG or ImageOptim)
3. **Responsive**: Consider providing multiple sizes for different screen sizes
4. **Lazy Loading**: Use Next.js Image component for automatic optimization

