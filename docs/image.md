# Image Component

A professional image component with automatic lazy loading, format optimization, and comprehensive error handling.

## Basic Usage

### In Dynamic Component

```vue
<template>
  <Image src="/api/assets/123" alt="Image description" />
</template>

<script setup>
// Component is automatically injected via useDynamicComponent
// No import needed
</script>
```

### Direct Usage

```vue
<template>
  <CommonImage src="/api/assets/123" alt="Image description" />
</template>
```

## Props

### Required

- **`src`** (string): Image source URL

### Optional

- **`alt`** (string): Image alt text (default: "")
- **`class`** (string): Custom CSS classes
- **`containerClass`** (string): Container CSS classes
- **`size`** ("xs" | "sm" | "md" | "lg" | "xl" | "custom"): Preset size (default: "custom")
- **`shape`** ("square" | "rounded" | "circle" | "none"): Image shape (default: "none")
- **`aspectRatio`** (string): Aspect ratio (e.g., "16/9", "4/3")
- **`fallbackSrc`** (string): Fallback image URL on error
- **`allowRetry`** (boolean): Allow retry on error (default: true)
- **`showErrorText`** (boolean): Show error text (default: false)
- **`errorText`** (string): Custom error text
- **`enableWebp`** (boolean): Enable WebP format (default: true)
- **`enableAvif`** (boolean): Enable AVIF format (default: true)


## Usage Examples

### Basic Image (Auto-optimized)

```vue
<!-- Automatically converts to /api/assets/123?format=avif -->
<Image src="/assets/123" alt="Product image" />
```

### Image with Preset Size

```vue
<Image src="/api/assets/123" size="lg" shape="rounded" alt="User avatar" />
```

### Image with Aspect Ratio

```vue
<Image
  src="/api/assets/123"
  aspect-ratio="16/9"
  class="w-full"
  alt="Landscape image"
/>
```

### Image with Fallback

```vue
<Image
  src="/api/assets/123"
  fallback-src="/api/assets/placeholder"
  :show-error-text="true"
  error-text="Failed to load image"
  alt="Image with fallback"
/>
```

### Image with Format Optimization

```vue
<Image 
  src="/api/assets/123" 
  :enable-webp="true"
  :enable-avif="true"
  alt="Optimized image"
/>
```

## Best Practices

### 1. Always Use Alt Text

```vue
<!-- ✅ Good -->
<Image src="/api/assets/123" alt="Company logo" />

<!-- ❌ Bad -->
<Image src="/api/assets/123" />
```

### 2. Use for Lists and Grids

```vue
<!-- ✅ Good for lists -->
<div v-for="item in items" :key="item.id">
  <Image 
    :src="item.imageUrl" 
    :alt="item.name"
  />
</div>
```

### 3. Use Fallback for Important Images

```vue
<!-- ✅ Good for important images -->
<Image
  src="/api/assets/123"
  fallback-src="/api/assets/placeholder"
  :show-error-text="true"
  alt="Product image"
/>
```

### 4. Optimize for Mobile

```vue
<!-- ✅ Responsive -->
<Image
  src="/api/assets/123"
  class="w-full md:w-1/2 lg:w-1/3"
  alt="Responsive image"
/>
```

### 5. Use Aspect Ratio for Stable Layout

```vue
<!-- ✅ Stable layout -->
<Image
  src="/api/assets/123"
  aspect-ratio="1/1"
  class="w-full"
  alt="Square image"
/>
```

## Size Presets

| Size     | Dimensions | Use Case                    |
| -------- | ---------- | --------------------------- |
| `xs`     | 32x32px    | Small icons, mini avatars   |
| `sm`     | 64x64px    | Small avatars, medium icons |
| `md`     | 96x96px    | Medium avatars              |
| `lg`     | 128x128px  | Large avatars, thumbnails   |
| `xl`     | 192x192px  | Large images                |
| `custom` | Custom     | Custom sized images         |

## Shapes

| Shape     | Description | Use Case       |
| --------- | ----------- | -------------- |
| `square`  | Square      | Original image |
| `rounded` | Rounded     | Modern UI      |
| `circle`  | Circle      | Avatars, icons |
| `none`    | No style    | Custom CSS     |

## Loading Behavior

### Automatic Lazy Loading

- Images only load when scrolled into viewport
- Saves bandwidth and improves performance
- Suitable for all use cases
- No props needed

## Format Optimization

Component automatically optimizes image URLs:

1. **Auto AVIF**: Automatically adds `format=avif` to backend assets if no format specified
2. **External services**: Adds format parameters for supported services (picsum.photos, etc.)
3. **Manual control**: You can override by adding format parameters to the src URL

**Examples:**
```vue
<!-- Auto-optimized: /api/assets/123 → /api/assets/123?format=avif -->
<Image src="/assets/123" alt="Auto AVIF" />

<!-- Manual override: Use your own format -->
<Image src="/assets/123?format=webp&quality=90" alt="Manual WebP" />

<!-- External service: Auto-adds format -->
<Image src="https://picsum.photos/400/300" alt="External optimized" />
```

## Error Handling

- **Auto retry**: Automatically retries 3 times on error
- **Fallback image**: Uses fallback image if provided
- **Error state**: Shows error icon and text
- **Manual retry**: Retry button for users

## Performance Tips

1. **Automatic lazy loading** - No configuration needed
2. **Optimize image size** before uploading
3. **Use format optimization** via backend query parameters
4. **Use aspect ratio** to prevent layout shift
5. **Use fallback** for important images

## Browser Support

- **Modern browsers**: Full feature support
- **Older browsers**: Falls back to immediate loading if IntersectionObserver not supported
- **Mobile**: Excellent support on all devices
