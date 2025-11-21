# Images Directory

Place your images here for use in the MeshFlow application.

## Recommended Images

### Hero Image
- **Path**: `/images/hero-graph.png` or `/images/hero-graph.jpg`
- **Size**: Recommended 1920x1080 or larger
- **Usage**: Home page hero section
- **Format**: PNG (with transparency) or JPG

### Features Image
- **Path**: `/images/features.png` or `/images/features.jpg`
- **Size**: Recommended 1024x1024 or larger
- **Usage**: Features section on home page
- **Format**: PNG or JPG

### Other Images
You can add any other images here and reference them using:
```tsx
<img src="/images/your-image.png" alt="Description" />
```

## Next.js Image Optimization

For better performance, use Next.js Image component:
```tsx
import Image from 'next/image';

<Image 
  src="/images/hero-graph.png" 
  alt="MeshFlow Knowledge Graph"
  width={1920}
  height={1080}
  priority
/>
```

