---
name: Obsidian & Linen
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#44474c'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f72'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#101c2c'
  on-primary-container: '#798499'
  inverse-primary: '#bbc7dd'
  secondary: '#006b58'
  on-secondary: '#ffffff'
  secondary-container: '#64f7d5'
  on-secondary-container: '#00705c'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e3fa'
  primary-fixed-dim: '#bbc7dd'
  on-primary-fixed: '#101c2c'
  on-primary-fixed-variant: '#3c4759'
  secondary-fixed: '#68fad7'
  secondary-fixed-dim: '#44ddbc'
  on-secondary-fixed: '#002019'
  on-secondary-fixed-variant: '#005142'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  stat-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1'
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
The design system for this luxury automotive marketplace is defined by a "Digital Concierge" persona: sophisticated, precise, and authoritative. It balances the editorial weight of a high-end auction house with the technical performance of a modern fintech platform.

The aesthetic follows a **Modern Corporate** foundation infused with **Minimalism** and subtle **Glassmorphism**. 
- **Exclusivity through Whitespace:** Generous margins and deep padding create a "gallery" feel where the machinery is the art.
- **Precision Engineering:** UI elements use razor-thin borders (hairlines) and micro-interactions that feel mechanical and responsive, mimicking the tactile feel of luxury car interiors.
- **High-Trust Atmosphere:** A shift away from clinical "tech white" toward warm, organic surfaces creates an inviting, human-centric environment for high-value transactions.

## Colors
The palette is built on a high-contrast foundation of **Midnight Obsidian Navy** and **Warm Champagne Linen**. 

- **Primary Shell:** Midnight Obsidian (#0A1626) is used for structural chrome, navigation, and footer areas to provide a solid, premium frame.
- **The Canvas:** Warm Champagne (#FDFAF5) serves as the primary background, offering a softer, more luxurious alternative to pure white. 
- **Gallary Surfaces:** Pure White (#FFFFFF) is reserved for elevated containers and cards to ensure vehicle imagery remains color-accurate and vibrant.
- **Interactive Precision:** Vivid Mint-Teal (#16C4A4) is the singular accent for CTAs and focus states, providing a high-performance "glow" against dark and light backgrounds alike.
- **Semantic Trust:** Trust Emerald (#10B981) is used exclusively for verification and escrow success states, while Live Crimson (#EF4444) signals urgency in bidding environments.

## Typography
This design system employs a sophisticated dual-type system.

- **The Editorial Layer:** *Playfair Display* provides a sense of heritage and luxury. It is used for vehicle titles, prices, and high-level headings. The tight letter-spacing and line heights ensure it feels modern rather than antique.
- **The Functional Layer:** *Inter* handles all long-form body content and descriptions, providing maximum readability.
- **The Technical Layer:** *Outfit* is used for interactive labels, buttons, and "caps" labels. Its geometric clarity reflects automotive precision.

On mobile devices, display sizes are clamped to ensure readability, while body sizes remain consistent to maintain accessibility.

## Layout & Spacing
The layout follows a **Fluid Grid** model with high-density components on a low-density canvas.

- **Rhythm:** A strict 4px/8px baseline grid governs all internal component spacing. 
- **Canvas:** Page-level sections use 64px (xxl) vertical padding to separate distinct phases of the user journey (e.g., Hero to Featured Showroom).
- **Listing View:** A 12-column grid is used for desktop. Filter sidebars are fixed at 280px, while the gallery content spans the remaining 1fr, typically reflowing from 3 columns to 1 on smaller screens.
- **Dashboards:** For data-intensive interactive dashboards, the margins contract to 32px to increase information density, allowing for side-by-side comparison of telemetry and bidding history.

## Elevation & Depth
Visual hierarchy is achieved through a combination of **Tonal Layering** and **Ambient Shadows**.

- **Level 0 (Base):** Warm Champagne (#FDFAF5) background. 
- **Level 1 (Surface):** Pure White (#FFFFFF) cards. These use a hairline border (1px) in Sandstone (#E0D8C8) to define their edges without adding visual weight.
- **Level 2 (Interactive):** When a card is hovered, it employs a soft, diffused shadow: `0 12px 32px rgba(10, 22, 38, 0.12)`. This lift effect is accompanied by a subtle 6px vertical translation.
- **Level 3 (Overlay):** Modals and sticky bidding panels use a high-blur glassmorphic backdrop filter (8px-12px) to maintain context while focusing the user on the primary action.

## Shapes
The shape language is **Rounded**, reflecting the aerodynamic curves of high-performance vehicles.

- **Standard Elements:** Buttons and small input fields use a 0.5rem (8px) radius.
- **Containers:** Vehicle cards and gallery blocks use a more generous 1rem (16px) radius to soften the high-contrast edges.
- **Technical Indicators:** Spec chips and category badges use a full pill-shape (999px) to distinguish them from functional buttons.

## Components

### Buttons
- **Primary:** Linear gradient (135deg, #16C4A4, #0C7B68). Text is white, semi-bold Outfit. Surfaces should have a subtle teal glow on hover.
- **Secondary/Ghost:** Hairline border in Sandstone. On hover, the background transitions to a 10% opacity of the Mint-Teal accent.
- **Urgent (Live Auction):** Pulsing crimson gradient. Used exclusively for "Place Bid" or "Live Now" states.

### Cards & Gallery
- **Vehicle Card:** 16:10 aspect ratio for images. Image should have a slight zoom (1.03x) on hover. Information is left-aligned, with the price right-aligned in Playfair Display.
- **Spec Chips:** Small Sandstone capsules with 11px uppercase labels and monochromatic icons.

### Inputs & Filters
- **Filtering System:** Uses a combination of vertical accordion menus for categories and horizontal capsule chips for active selections. Selected chips flip to Mint-Teal background with white text.
- **Range Sliders:** Minimalist horizontal tracks with oversized circular handles for ease of use on touch devices.

### Marketplace Specifics
- **Bidding Panel:** A high-contrast dark surface (#0A1626) when sticky. Real-time numbers should use a "ticker" animation when updating.
- **Trust Indicators:** The "Verified Dealer" shield is a composite component—a small emerald pill badge with a 1px emerald border and a checkmark icon. 
- **Market Pulse:** A horizontal delta bar that visually indicates where the current price sits relative to "Fair Market Value," using a tri-color scale (Green-Yellow-Red).
