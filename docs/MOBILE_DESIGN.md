# KAYAD Mobile Design System

## Overview

This document outlines the premium mobile automotive marketplace design system for KAYAD. The mobile experience is designed to feel like a native application with exceptional attention to touch interaction, performance, and visual polish.

---

## Mobile Architecture

### Responsive Detection

The app automatically detects mobile devices (< 768px) and serves optimized mobile routes:

```jsx
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
```

### Route Structure

```
/           → MobileHomePage (mobile) / HomePage (desktop)
/browse     → MobileBrowsePage (mobile) / BrowsePage (desktop)
/gallery   → SharedGalleryPage
/auctions   → SharedAuctionPage
/cars/:id   → CarDetailPage
```

---

## Design Tokens

### Mobile-Specific Variables

```css
:root {
  /* Touch target minimum (44px per Apple HIG & WCAG) */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
  --touch-target-spacious: 56px;

  /* Safe area insets */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);

  /* Bottom nav height */
  --bottom-nav-height: 72px;
  --header-height: 56px;

  /* Mobile typography scale */
  --mobile-text-xs: 0.6875rem;    /* 11px */
  --mobile-text-sm: 0.8125rem;    /* 13px */
  --mobile-text-base: 0.9375rem;  /* 15px */
  --mobile-text-lg: 1.0625rem;    /* 17px */
  --mobile-text-xl: 1.25rem;      /* 20px */

  /* Mobile animation durations */
  --mobile-duration-instant: 100ms;
  --mobile-duration-fast: 200ms;
  --mobile-duration-normal: 300ms;
}
```

---

## Components

### MobileBottomNav

Premium bottom navigation with:
- **Haptic-style feedback** via scale animations
- **Active indicator** with animated gold bar
- **Floating Action Button (FAB)** for primary action (Sell)
- **Safe area padding** for notched devices

```jsx
import { MobileBottomNav } from './components/mobile';

<MobileBottomNav />
```

### MobileSearchBar

Enhanced search with:
- Voice search support (Web Speech API)
- Recent searches (localStorage)
- Trending searches
- Real-time suggestions
- Animated focus states

```jsx
import { MobileSearchBar } from './components/mobile';

<MobileSearchBar
  value={query}
  onChange={setQuery}
  onSubmit={handleSearch}
  onVoiceSearch={handleVoiceSearch}
  placeholder="Search cars, brands, or models..."
/>
```

### MobileFilterDrawer

Native-feeling filter panel with:
- **Bottom sheet animation** (slides up from bottom)
- **Scrollable content** with overscroll containment
- **Haptic-style chip toggles** (min 44px touch targets)
- **Range sliders** with custom thumb styling
- **Quick filter toggles** for common filters

```jsx
import { MobileFilterDrawer } from './components/mobile';

<MobileFilterDrawer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  filters={filters}
  onFilterChange={setFilters}
  onApply={handleApply}
  onReset={handleReset}
/>
```

### MobileCarCard

Swipeable card with:
- **Gesture support** (swipe to favorite)
- **Image skeleton** loading state
- **Live badge** with pulsing animation
- **Verified/Inspected badges**
- **Favorite button** with heart animation

```jsx
import { MobileCarCard, MobileCarCardSkeleton } from './components/mobile';

// Card
<MobileCarCard
  car={vehicleData}
  onFavorite={handleFavorite}
/>

// Loading skeleton
<MobileCarCardSkeleton />
```

### MobileForm Components

Touch-optimized form inputs:
- **44px minimum touch targets**
- **Large, clear labels**
- **Inline validation** with error messages
- **Haptic-style checkbox/radio animations**

```jsx
import { Input, Textarea, Select, Checkbox, Toggle } from './components/mobile';

<Input
  label="Vehicle Title"
  required
  error={errors.title}
  placeholder="e.g., Toyota Land Cruiser V8"
/>

<Toggle
  label="Featured Listing"
  description="Appear at top of search results"
  checked={isFeatured}
  onChange={setIsFeatured}
/>
```

### MobileEmptyState

Beautiful empty states with:
- **Animated floating icon**
- **Helpful description**
- **Action button**

```jsx
import { MobileEmptyState } from './components/mobile';

// Template-based
<MobileEmptyState template="search" onAction={handleClear} />

// Custom
<MobileEmptyState
  icon="🚗"
  title="No cars found"
  description="Try adjusting your filters"
  actionLabel="Clear Filters"
  onAction={handleClear}
/>
```

### MobileSkeleton

Premium loading skeletons:
- **Shimmer animation** for visual appeal
- **Staggered entrance** for list items
- **Multiple skeleton types** (card, list, detail, page)

```jsx
import { MobileCardSkeleton, MobileStaggeredList } from './components/mobile';

// Grid skeleton
<div className="mobile-card-grid">
  {[1, 2, 3, 4].map(i => <MobileCardSkeleton key={i} />)}
</div>

// Staggered list
<MobileStaggeredList count={5} />
```

### MobileToast

Native-feeling notifications:
- **Swipe to dismiss**
- **Auto-dismiss with progress**
- **Success/Error/Info variants**
- **Action buttons**

```jsx
import { useToast } from './components/mobile';

const { success, error } = useToast();

success('Vehicle saved to favorites!');
error('Failed to load vehicles. Please try again.');
```

---

## Performance Optimizations

### Lazy Loading
- Images use `loading="lazy"` and Intersection Observer
- Skeleton placeholders while loading
- Progressive image reveal on load

### Infinite Scroll
```jsx
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && hasMore) {
      loadMore();
    }
  },
  { threshold: 0.1 }
);
```

### Service Worker Caching

| Cache | Strategy | TTL |
|-------|----------|-----|
| Static assets | Cache-first | Permanent |
| Images | Cache-first + background refresh | 7 days |
| API responses | Network-first | Session |
| Navigation | Network, fallback to cache | - |

---

## Accessibility

### Touch Targets
All interactive elements are minimum 44x44px per WCAG 2.1 Level AA and Apple Human Interface Guidelines.

### Focus Management
- Clear focus states with gold outline
- Skip links for keyboard navigation
- ARIA labels on all interactive elements

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## PWA Features

### Manifest
- App shortcuts (Browse, Auctions, Sell)
- Standalone display mode
- Portrait orientation lock
- Custom theme colors

### Service Worker
- Offline fallback pages
- Background sync for favorites
- Push notification support

### Installation Prompt
The app shows an install banner when:
- Service worker is ready
- User hasn't already installed
- User has engaged with the app

---

## Stitch Design System Integration

The **Obsidian & Linen** design system from Stitch is fully integrated into the KAYAD codebase.

### Brand & Style
- **Digital Concierge** persona: sophisticated, precise, and authoritative
- Modern Corporate foundation with Minimalism and subtle Glassmorphism
- Exclusivity through Whitespace with 64px page-level sections
- High-Trust Atmosphere with warm, organic surfaces

### Color Palette

```css
:root {
  /* Primary Shell: Midnight Obsidian */
  --obsidian:      #0A1626;
  --obsidian-800:  #0D1E33;
  --obsidian-700:  #112440;
  --obsidian-600:  #15294A;

  /* Canvas: Warm Champagne */
  --surface-base:  #fcf9f4;
  --surface-dim:   #dcdad5;

  /* Gallery Surfaces */
  --surface-container-lowest: #ffffff;
  --surface-container-low:    #f6f3ee;
  --surface-container:        #f0ede9;
  --surface-container-high:   #ebe8e3;
  --surface-container-highest:#e5e2dd;

  /* Interactive Precision: Vivid Mint-Teal */
  --brand:         #16C4A4;
  --brand-dark:    #0C7B68;
  --brand-light:   #2DD9BE;
  --brand-gradient: linear-gradient(135deg, #16C4A4, #0C7B68);

  /* Semantic Trust */
  --accent-emerald: #10B981;  /* Verification, escrow success */
  --live-crimson:  #EF4444;   /* Bidding urgency */
}
```

### Typography

**The Editorial Layer:** Playfair Display for vehicle titles, prices, and headings
**The Functional Layer:** Inter for body content and descriptions
**The Technical Layer:** Outfit for interactive labels, buttons, and caps labels

```css
:root {
  /* Display */
  --font-display: 'Playfair Display', Georgia, serif;
  /* Body */
  --font-body: 'Inter', system-ui, sans-serif;
  /* Technical */
  --font-technical: 'Outfit', system-ui, sans-serif;
}
```

### Component Specifications

#### Buttons
- **Primary:** Linear gradient (135deg, #16C4A4, #0C7B68) with teal glow on hover
- **Secondary/Ghost:** Hairline border with hover transition to 10% Mint-Teal
- **Urgent (Live Auction):** Pulsing crimson gradient for "Place Bid" states

#### Cards & Gallery
- **Vehicle Card:** 16:10 aspect ratio, 1.03x image zoom on hover
- **Spec Chips:** Sandstone capsules with 11px uppercase labels
- **Elevation:** Cards use hairline border (1px) in Sandstone

#### Bidding Panel
- High-contrast dark surface (#0A1626) when sticky
- Real-time numbers use "ticker" animation when updating

### Layout & Spacing
- **Baseline Grid:** 4px/8px for internal component spacing
- **Page Sections:** 64px vertical padding (--space-16)
- **Desktop Grid:** 12-column with 280px fixed filter sidebar
- **Dashboards:** 32px margins for increased information density

### Shape Language
- **Standard Elements:** 8px radius (--radius-md)
- **Containers:** 16px radius (--radius-lg)
- **Technical Indicators:** Full pill-shape (9999px)

### Elevation & Depth
- **Level 0:** Warm Champagne background
- **Level 1:** Pure White cards with hairline border
- **Level 2:** Hover uses `0 12px 32px rgba(10, 22, 38, 0.12)` + 6px vertical lift
- **Level 3:** Modals use glassmorphic backdrop filter (8-12px blur)

### Verified Dealer Badge
```jsx
// Composite component: emerald pill badge with checkmark
<Badge variant="success" outline icon={<CheckIcon />}>
  Verified Dealer
</Badge>
```

### Market Pulse Component
Horizontal delta bar indicating current price vs Fair Market Value using tri-color scale (Green-Yellow-Red).

---

## Animation Guidelines

### Durations
- **Instant**: 100ms (micro-interactions)
- **Fast**: 200ms (hover states)
- **Normal**: 300ms (page transitions)
- **Slow**: 400ms (modals, drawers)

### Easing
```css
--mobile-ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--mobile-ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);
--mobile-ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Key Animations
- **List stagger**: 50ms delay between items
- **Card entrance**: Fade + translateY
- **Drawer slide**: Transform from bottom
- **Button press**: Scale to 0.97

---

## File Structure

```
src/
├── components/
│   └── mobile/
│       ├── index.js              # Exports
│       ├── MobileBottomNav.jsx    # Bottom navigation
│       ├── MobileSearchBar.jsx    # Search with voice
│       ├── MobileFilterDrawer.jsx # Filter panel
│       ├── MobileCarCard.jsx      # Vehicle cards
│       ├── MobileEmptyState.jsx   # Empty states
│       ├── MobileSkeleton.jsx     # Loading skeletons
│       ├── MobilePage.jsx         # Layout components
│       ├── MobileForm.jsx         # Form components
│       ├── MobileToast.jsx        # Notifications
│       └── MobileHeader.jsx       # Header variants
├── pages/
│   └── mobile/
│       ├── MobileHomePage.jsx     # Home screen
│       └── MobileBrowsePage.jsx   # Browse screen
└── styles/
    └── mobile.css                 # Mobile design tokens
```

---

## Testing Checklist

### Touch Interactions
- [ ] All buttons respond to tap (min 44px)
- [ ] Swipe gestures work on cards
- [ ] Pull-to-refresh triggers
- [ ] Bottom drawer dismisses with swipe

### Performance
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s
- [ ] No layout shift during load
- [ ] Images lazy load correctly

### Offline
- [ ] Service worker registers
- [ ] Cached pages load offline
- [ ] Offline indicator shows
- [ ] Forms queue for sync

### Accessibility
- [ ] VoiceOver reads all elements
- [ ] Touch targets are visible
- [ ] Focus order is logical
- [ ] Animations respect reduced-motion

---

## Design System: Obsidian & Linen

The premium automotive marketplace uses a "Digital Concierge" persona: sophisticated, precise, and authoritative. The aesthetic follows **Modern Corporate** foundation with **Minimalism** and subtle **Glassmorphism**.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#fcf9f4` | Warm Champagne background |
| `surface-container-lowest` | `#ffffff` | Elevated cards |
| `primary` | `#000000` | Structural chrome |
| `primary-container` | `#101c2c` | Midnight Obsidian |
| `secondary` | `#006b58` | Trust Emerald |
| `accent` | `#16C4A4` | Mint-Teal CTAs |
| `error` | `#ba1a1a` | Live Crimson (bidding urgency) |

### Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| Display | Playfair Display | 48px | 700 |
| Headline | Playfair Display | 32px | 700 |
| Body | Inter | 16px | 400 |
| Label | Outfit | 14px | 600 |
| Stat | Outfit | 32px | 800 |

### Spacing Scale

```
xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | xxl: 64px
```

### Component Styles

#### Buttons
- **Primary:** Linear gradient (135deg, #16C4A4, #0C7B68) with teal glow on hover
- **Secondary:** Hairline Sandstone border, 10% Mint-Teal on hover
- **Urgent (Live Auction):** Pulsing crimson gradient for "Place Bid"

#### Cards & Gallery
- Vehicle Card: 16:10 aspect ratio, 1.03x zoom on hover
- Spec Chips: Sandstone capsules with 11px uppercase labels

#### Elevation
- Level 0: Warm Champagne base
- Level 1: Pure White cards with 1px Sandstone border
- Level 2: Soft shadow `0 12px 32px rgba(10, 22, 38, 0.12)` + 6px lift
- Level 3: Glassmorphic backdrop (8-12px blur)

### Marketplace Elements
- **Bidding Panel:** Dark surface (#0A1626) when sticky
- **Market Pulse:** Tri-color scale (Green-Yellow-Red) for FMV comparison
- **Verified Dealer Badge:** Emerald pill with checkmark
