# FrontendUI - Styling & Architecture Documentation

## Overview

FrontendUI is a modern React-based frontend application built with Vite, featuring a comprehensive styling system using Tailwind CSS v4, shadcn/ui components, and custom CSS configurations. The application supports both light and dark themes with a sophisticated color system.

## Table of Contents

- [Project Structure](#project-structure)
- [Styling Architecture](#styling-architecture)
- [CSS Configuration](#css-configuration)
- [Theme System](#theme-system)
- [Component Styling](#component-styling)
- [Build Configuration](#build-configuration)
- [Development Setup](#development-setup)

---

## Project Structure

```
frontendUi/
├── src/
│   ├── app/                    # Application core
│   │   ├── App.jsx            # Main app component
│   │   ├── providers.jsx      # Context providers
│   │   └── router.jsx         # Routing configuration
│   │
│   ├── components/            # Reusable components
│   │   ├── layout/           # Layout components
│   │   │   ├── AppLayout.jsx
│   │   │   ├── AuthLayout.jsx
│   │   │   └── EmbedLayout.jsx
│   │   ├── ui/               # shadcn/ui components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Dialog.jsx
│   │   │   └── ... (32 UI components)
│   │   └── modals/           # Modal components
│   │
│   ├── features/             # Feature-based modules
│   │   ├── admin/           # Admin features
│   │   ├── auth/            # Authentication
│   │   ├── chat/            # Chat functionality
│   │   ├── client/          # Client management
│   │   ├── embed/           # Embed widget
│   │   └── user/            # User features
│   │
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   ├── store/               # Zustand state management
│   ├── styles/              # CSS styling files
│   │   ├── globals.css      # Global styles & theme
│   │   └── components.css   # Component-specific styles
│   │
│   ├── index.css            # Entry CSS (empty)
│   ├── App.css              # App-level styles
│   └── main.jsx             # Application entry point
│
├── public/                  # Static assets
├── tailwind.config.js      # Tailwind CSS configuration
├── components.json          # shadcn/ui configuration
├── vite.config.js          # Vite build configuration
└── package.json            # Dependencies
```

---

## Styling Architecture

### Core Technologies

- **Tailwind CSS v4.1.11** - Utility-first CSS framework
- **shadcn/ui** - High-quality React component library
- **CSS Custom Properties** - For theme variables
- **OKLCH Color Space** - Modern color format for dark mode
- **HSL Color Space** - Traditional format for light mode

### Styling Strategy

The application uses a **hybrid approach** combining:
1. **Tailwind utility classes** - For rapid development
2. **CSS custom properties** - For theme management
3. **Component-scoped CSS** - For widget-specific styles
4. **Global CSS** - For base styles and animations

---

## CSS Configuration

### File Structure

#### 1. `src/styles/globals.css`
**Purpose**: Main stylesheet containing theme tokens, global styles, and Tailwind imports.

**Key Features**:
- Tailwind CSS v4 import using `@import "tailwindcss"`
- Theme token definitions using `@theme` directive
- Dark mode variant configuration
- Custom animations and keyframes
- Scrollbar styling utilities
- Table styling utilities

**Theme Tokens**:
```css
@theme {
  /* Light Mode - Blue Brand Color */
  --color-brand: #3B82F6;
  --color-primary-50 through --color-primary-900;
  
  /* Animations */
  --animate-fade-in: fadeIn 0.5s ease-in-out;
  --animate-slide-up: slideUp 0.3s ease-out;
  --animate-pulse-slow: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;
}
```

**Dark Mode Overrides**:
- Uses OKLCH color space for better color consistency
- Red-themed primary colors in dark mode
- Comprehensive color token system for all UI elements

#### 2. `src/styles/components.css`
**Purpose**: Widget-specific styling for embedded chat components.

**Key Features**:
- Widget container styling with glassmorphism effects
- Message bubble animations
- Responsive grid layouts
- Custom scrollbar for messages
- Typing indicator animations
- Pre-question button styling

**Widget Variables**:
```css
:root {
  --widget-primary: #2ecc71;
  --widget-bg: #f7fafc;
  --widget-surface: #fff;
  --widget-shadow: 0 6px 32px rgba(46,204,113,0.08);
  --widget-radius: 18px;
  --widget-glass-bg: rgba(255,255,255,0.92);
  --widget-glass-blur: blur(24px);
}
```

#### 3. `src/App.css`
**Purpose**: Application-level styles (minimal, mostly legacy Vite template styles).

**Contents**:
- Root container styling
- Logo animations
- Card padding utilities
- Legacy animation keyframes

#### 4. `src/index.css`
**Purpose**: Entry point CSS file (currently empty).

---

## Theme System

### Light Mode

**Color Scheme**: Blue-based primary colors
- **Brand Color**: `#3B82F6` (Blue-500)
- **Primary Scale**: 50-900 shades of blue
- **Background**: White (`0 0% 100%` in HSL)
- **Foreground**: Dark gray (`222.2 84% 4.9%` in HSL)

**Color Format**: HSL (Hue, Saturation, Lightness)

### Dark Mode

**Color Scheme**: Red-themed primary colors
- **Brand Color**: `oklch(0.577 0.245 27.325)` (Red-tinted)
- **Primary Scale**: 50-900 shades using OKLCH
- **Background**: Very dark (`oklch(0.141 0.005 285.823)`)
- **Foreground**: Near white (`oklch(0.985 0 0)`)

**Color Format**: OKLCH (Lightness, Chroma, Hue)
- Better perceptual uniformity
- More vibrant colors in dark mode
- Improved accessibility

### Theme Variables

The application uses CSS custom properties for all theme values:

**Semantic Tokens**:
- `--background` / `--foreground`
- `--card` / `--card-foreground`
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--muted` / `--muted-foreground`
- `--accent` / `--accent-foreground`
- `--destructive` / `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--sidebar-*` (sidebar-specific tokens)
- `--chart-1` through `--chart-5` (chart colors)

**Border Radius**:
- Base radius: `0.65rem`
- Variants: `sm`, `md`, `lg`, `xl` (calculated from base)

### Dark Mode Implementation

Dark mode is implemented using the **class strategy**:
- Toggle: Add/remove `.dark` class on root element
- Variant: `@custom-variant dark (&:where(.dark, .dark *))`
- All dark mode styles are scoped under `.dark` selector

---

## Component Styling

### shadcn/ui Components

The application uses **shadcn/ui** with the "new-york" style variant.

**Configuration** (`components.json`):
```json
{
  "style": "new-york",
  "baseColor": "slate",
  "cssVariables": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles/globals.css"
  }
}
```

**Available UI Components** (32 components):
- Alert, Avatar, Badge, Button, Card
- Checkbox, Dialog, Dropdown, Input, Label
- Modal, Pagination, Progress, Radio, Select
- Skeleton, Spinner, Switch, Table, Tabs
- Textarea, ThemeToggle, Toast, Tooltip
- Chart components, OTP Input, Sonner toast

### Custom Component Styles

**Widget Components** (`components.css`):
- `.widget-container` - Main widget wrapper
- `.message-bubble` - Chat message styling
- `.suggested-question` - Pre-question buttons
- `.typing-dots` - Typing indicator
- `.send-btn` - Send button styling

**Layout Components**:
- Responsive grid layouts
- Glassmorphism effects for headers
- Sticky positioning utilities

---

## Tailwind Configuration

### `tailwind.config.js`

**Key Settings**:
- **Content**: Scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`
- **Dark Mode**: `'class'` strategy
- **Theme Extensions**:
  - Color system using CSS variables
  - Border radius variants
  - Custom animations
  - Keyframes definitions

**Plugins**:
- `@tailwindcss/forms` - Form styling utilities
- `@tailwindcss/typography` - Typography plugin
- `tailwindcss-animate` - Animation utilities

**Color System**:
All colors reference CSS custom properties:
```javascript
colors: {
  primary: {
    DEFAULT: 'var(--primary)',
    foreground: 'var(--primary-foreground)',
    50: 'var(--color-primary-50)',
    // ... through 900
  },
  // ... other color tokens
}
```

### Tailwind v4 Features

The project uses **Tailwind CSS v4** which introduces:
- `@theme` directive for token definitions
- `@custom-variant` for custom variants
- Improved CSS variable support
- Better dark mode handling

---

## Custom Utilities

### Scrollbar Styling

**Class**: `.scrollbar-thin`
- Thin scrollbar for horizontal table scrolling
- Custom webkit scrollbar styling
- Hover effects
- Transparent track

### Table Utilities

**Class**: `.table-row-hover`
- Smooth hover transitions
- Transform and shadow effects
- Enhanced user interaction feedback

### Loading Animations

**Class**: `.loading-dots`
- Animated dot sequence
- Staggered animation delays
- Pulse animation effect

### Custom Animations

**Keyframes**:
- `fadeIn` - Opacity transition
- `slideUp` - Transform + opacity
- `slideIn` - Widget message animation
- `widget-typing` - Typing indicator
- `spin` - Rotation animation

**Animation Tokens**:
- `--animate-fade-in`
- `--animate-slide-up`
- `--animate-pulse-slow`

---

## Build Configuration

### Vite Configuration (`vite.config.js`)

**Key Features**:
- **Tailwind Plugin**: `@tailwindcss/vite` for PostCSS integration
- **Path Aliases**: `@/` for `src/` directory
- **CSS Configuration**:
  - Source maps in development
  - SCSS preprocessor support
  - CSS variable support

**Build Optimizations**:
- Code splitting with manual chunks
- Vendor separation (React, UI libraries, state management)
- Asset organization (images, fonts, etc.)
- Bundle size warnings

**Development Server**:
- Port: `5173` (configurable via `VITE_DEV_SERVER_PORT`)
- Proxy: `/api` routes to backend
- HMR: Hot Module Replacement enabled
- CORS: Enabled for development

### Dependencies

**Styling-Related Packages**:
```json
{
  "tailwindcss": "^4.1.11",
  "@tailwindcss/vite": "^4.1.11",
  "tailwindcss-animate": "^1.0.7",
  "@tailwindcss/forms": "^0.5.9",
  "@tailwindcss/typography": "^0.5.15",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "class-variance-authority": "^0.7.1"
}
```

**UI Component Libraries**:
- `@radix-ui/*` - Headless UI primitives
- `lucide-react` - Icon library
- `framer-motion` - Animation library
- `sonner` - Toast notifications

---

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontendUi
npm install
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables

Create a `.env` file:
```env
VITE_BACKEND_URL=http://localhost:8080
VITE_DEV_SERVER_PORT=5173
VITE_DEV_SERVER_HOST=localhost
VITE_AUTO_OPEN_BROWSER=true
```

### Styling Workflow

1. **Global Styles**: Edit `src/styles/globals.css`
2. **Component Styles**: Edit `src/styles/components.css`
3. **Theme Tokens**: Modify `@theme` block in `globals.css`
4. **Tailwind Config**: Adjust `tailwind.config.js` for utilities
5. **Component Classes**: Use Tailwind utilities in JSX

### Theme Development

**Adding New Theme Tokens**:
1. Add to `@theme` block in `globals.css`
2. Add dark mode override in `.dark` selector
3. Reference in `tailwind.config.js` if needed
4. Use in components via `var(--token-name)` or Tailwind classes

**Testing Dark Mode**:
- Toggle via `ThemeToggle` component
- Or manually add `.dark` class to root element
- Check browser DevTools for CSS variable values

---

## Best Practices

### Styling Guidelines

1. **Prefer Tailwind Utilities**: Use utility classes for most styling
2. **CSS Variables**: Use for theme values and dynamic styles
3. **Component CSS**: Only for complex widget-specific styles
4. **Responsive Design**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, etc.)
5. **Dark Mode**: Always test both light and dark themes

### Performance

- **CSS Purging**: Tailwind automatically purges unused styles
- **CSS Variables**: Efficient for theme switching
- **Animations**: Use `transform` and `opacity` for GPU acceleration
- **Bundle Size**: Monitor with `rollup-plugin-visualizer`

### Accessibility

- **Color Contrast**: Ensure WCAG AA compliance
- **Focus States**: Visible focus indicators
- **Reduced Motion**: Respect `prefers-reduced-motion`
- **Semantic HTML**: Use proper HTML elements

---

## Troubleshooting

### Common Issues

**Styles Not Applying**:
- Check Tailwind content paths in `tailwind.config.js`
- Verify CSS import in `main.jsx`
- Clear Vite cache: `rm -rf node_modules/.vite`

**Dark Mode Not Working**:
- Ensure `.dark` class is on root element
- Check CSS variable definitions
- Verify `darkMode: 'class'` in Tailwind config

**Build Errors**:
- Update dependencies: `npm update`
- Clear build cache: `rm -rf dist`
- Check Node.js version compatibility

---

## Additional Resources

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Vite Documentation](https://vitejs.dev)
- [OKLCH Color Space](https://oklch.com)

---

## License

This project is part of the SaaS Chatbot Platform.

