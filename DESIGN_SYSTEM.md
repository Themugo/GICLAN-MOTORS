# KAYAD Design System

A unified visual language for the KAYAD automotive marketplace.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Typography](#typography)
3. [Colors](#colors)
4. [Spacing](#spacing)
5. [Shadows](#shadows)
6. [Radius](#radius)
7. [Transitions](#transitions)
8. [Components](#components)

---

## Design Tokens

Design tokens are the atomic values that power the entire design system. They ensure visual consistency across all components.

### Usage in Code

```tsx
// CSS variables (most common)
<div style={{ background: 'var(--brand)', padding: 'var(--space-4)' }}>

// JavaScript tokens
import { tokens } from '@/components/ui';
<div style={{ background: tokens.colors.brand[500] }}>
```

### CSS Variables Reference

All tokens are defined in `src/index.css` as CSS custom properties:

```css
:root {
  /* Colors */
  --brand: #16C4A4;
  --text-primary: #2E2B28;
  --text-secondary: #4A4540;
  --bg-elevated: #FFFFFF;
  --border: #E0D8C8;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

---

## Typography

### Font Families

| Name | Usage | Stack |
|------|-------|-------|
| **Display** | Headings, hero text | `Playfair Display, Georgia, serif` |
| **Sans** | Body, UI elements | `Inter, -apple-system, sans-serif` |

### Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 0.75rem (12px) | Captions, timestamps |
| `--text-sm` | 0.875rem (14px) | Secondary text |
| `--text-base` | 1rem (16px) | Body text |
| `--text-lg` | 1.125rem (18px) | Lead paragraphs |
| `--text-xl` | 1.25rem (20px) | Section headers |
| `--text-2xl` | 1.5rem (24px) | Card titles |
| `--text-3xl` | 1.875rem (30px) | Page headers |
| `--text-4xl` | 2.25rem (36px) | Hero titles |
| `--text-5xl` | 3rem (48px) | Landing hero |

### Usage

```tsx
// Using Tailwind (preferred)
<h1 className="text-4xl font-display font-bold">Heading</h1>
<p className="text-base text-secondary">Body text</p>

// Using CSS variables
<h1 style={{ fontSize: 'var(--text-4xl)', fontFamily: 'var(--font-display)' }}>
  Heading
</h1>
```

---

## Colors

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--brand` | `#16C4A4` | Primary actions, links |
| `--brand-dark` | `#0C7B68` | Hover states |
| `--brand-light` | `#2DD9BE` | Highlights |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#10B981` | Success states |
| `--color-warning` | `#F59E0B` | Warnings |
| `--color-error` | `#EF4444` | Errors |
| `--color-info` | `#3B82F6` | Information |

### Surface Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#FDFAF5` | Page background |
| `--bg-elevated` | `#FFFFFF` | Cards, modals |
| `--surface` | `#F7F2E8` | Subtle backgrounds |
| `--border` | `#E0D8C8` | Borders, dividers |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#2E2B28` | Primary text |
| `--text-secondary` | `#4A4540` | Secondary text |
| `--text-muted` | `#9A9088` | Placeholder, hints |

---

## Spacing

Base unit: 4px

| Token | Value | Common Usage |
|-------|-------|--------------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Icon gaps |
| `--space-3` | 12px | Input padding |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large gaps |
| `--space-10` | 40px | Section padding |
| `--space-12` | 48px | Hero spacing |
| `--space-16` | 64px | Major sections |
| `--space-20` | 80px | Page sections |

### Usage

```tsx
// Tailwind (preferred)
<div className="p-4 gap-4">
<div className="px-6 py-8">

// CSS variables
<div style={{ padding: 'var(--space-4)', gap: 'var(--space-4)' }}>
```

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle lift |
| `--shadow-md` | Multi-layer | Cards, dropdowns |
| `--shadow-lg` | Multi-layer | Modals, popovers |
| `--shadow-xl` | Multi-layer | Large surfaces |
| `--shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.15)` | Maximum elevation |
| `--shadow-glow` | Blue glow | Focus states |

### Usage

```tsx
// Tailwind (preferred)
<div className="shadow-md hover:shadow-lg">

// CSS variables
<div style={{ boxShadow: 'var(--shadow-md)' }}>
```

---

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small inputs |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Large cards |
| `--radius-2xl` | 20px | Modals |
| `--radius-full` | 9999px | Pills, avatars |

### Usage

```tsx
// Tailwind (preferred)
<button className="rounded-lg">
<input className="rounded-md">

// CSS variables
<button style={{ borderRadius: 'var(--radius-lg)' }}>
```

---

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy effects |
| `--dur-fast` | 150ms | Hover states |
| `--dur-normal` | 250ms | Standard transitions |
| `--dur-slow` | 400ms | Page transitions |

### Usage

```tsx
// Tailwind (preferred)
<button className="transition-all duration-200 hover:scale-105">

// CSS variables
<div style={{ transition: 'all var(--dur-normal) var(--ease-out)' }}>
```

---

## Components

### Button

Primary interaction element with multiple variants.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">
  Save Changes
</Button>

<Button variant="secondary" size="sm" icon={<Icon />}>
  Cancel
</Button>

<Button variant="danger" loading>
  Deleting...
</Button>
```

**Variants**: `primary` | `secondary` | `ghost` | `danger`

**Sizes**: `sm` | `md` | `lg`

### Input

Form input with built-in label, hint, and error states.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  hint="We'll never share your email"
/>

<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
  required
/>
```

### Card

Container component with optional header and footer.

```tsx
import { Card, CardHeader, CardFooter } from '@/components/ui';

<Card hoverEffect>
  <CardHeader
    title="Car Details"
    subtitle="2023 Toyota Land Cruiser"
    action={<Button size="sm">Edit</Button>}
  />

  <div>
    {/* Card content */}
  </div>

  <CardFooter align="right">
    <Button variant="ghost">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Table

Data table with sorting and loading states.

```tsx
import { Table, type TableColumn } from '@/components/ui';

interface Car {
  id: number;
  make: string;
  model: string;
  price: number;
}

const columns: TableColumn<Car>[] = [
  { key: 'make', header: 'Make' },
  { key: 'model', header: 'Model' },
  {
    key: 'price',
    header: 'Price',
    align: 'right',
    render: (row) => formatKES(row.price)
  },
];

<Table columns={columns} data={cars} striped hoverable />
```

### Badge

Status indicators and tags.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Verified</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Rejected</Badge>
<Badge variant="info">New</Badge>
```

### Modal

Dialog overlay with focus management.

```tsx
import { Modal } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure you want to proceed?</p>

  <Modal.Footer>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button onClick={handleConfirm}>Confirm</Button>
  </Modal.Footer>
</Modal>
```

### Tabs

Tab navigation component.

```tsx
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui';

<Tabs defaultValue="tab1">
  <TabList>
    <Tab value="tab1">Overview</Tab>
    <Tab value="tab2">Details</Tab>
  </TabList>

  <TabPanel value="tab1">
    Tab content here
  </TabPanel>

  <TabPanel value="tab2">
    Another tab content
  </TabPanel>
</Tabs>
```

### FormField

Accessible form components with validation.

```tsx
import { FormField, FormTextarea, FormSelect } from '@/components/ui';

<FormField
  name="email"
  label="Email"
  type="email"
  required
  error={errors.email}
  validators={[validators.required, validators.email]}
/>

<FormTextarea
  name="message"
  label="Message"
  rows={4}
  required
/>

<FormSelect
  name="country"
  label="Country"
  options={[
    { value: 'ke', label: 'Kenya' },
    { value: 'tz', label: 'Tanzania' },
  ]}
/>
```

### Skeleton

Loading placeholders for content.

```tsx
import { CardSkeleton, ListItemSkeleton, TableSkeleton } from '@/components/ui';

// Card loading state
<CardSkeleton count={3} />

// List loading state
<ListItemSkeleton count={5} />

// Table loading state
<TableSkeleton rows={5} columns={4} />
```

### EmptyState

Displayed when no content is available.

```tsx
import { EmptyState } from '@/components/ui';

<EmptyState
  icon={<NoDataIcon />}
  title="No cars found"
  description="Try adjusting your filters to find what you're looking for."
  action={
    <Button variant="secondary" onClick={clearFilters}>
      Clear Filters
    </Button>
  }
/>
```

---

## Utility Classes

### Spacing Utilities

```html
<!-- Stack (vertical gap) -->
<div class="stack">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Section -->
<section class="section">
  <!-- Content with consistent vertical padding -->
</section>
```

### Button Utilities

```html
<!-- UI Button System (CSS-based) -->
<button class="ui-btn ui-btn--primary">Primary</button>
<button class="ui-btn ui-btn--secondary">Secondary</button>
<button class="ui-btn ui-btn--ghost">Ghost</button>
<button class="ui-btn ui-btn--danger">Danger</button>
```

---

## File Structure

```
src/
├── components/
│   └── ui/
│       ├── index.ts              # Exports all components
│       ├── tokens.ts             # JS token utilities
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       ├── Table.tsx
│       ├── Tabs.tsx
│       ├── FormField.tsx
│       ├── Alert.tsx
│       ├── Progress.tsx
│       ├── Skeleton.tsx
│       ├── Avatar.tsx
│       ├── Tooltip.tsx
│       ├── Dropdown.tsx
│       ├── SkipLink.tsx
│       ├── ErrorBoundary.tsx
│       └── ThemeContext.tsx
├── styles/
│   ├── mobile.css
│   └── dealer.css
└── index.css                    # CSS variables & base styles
```

---

## Best Practices

### Do's ✅

```tsx
// Use design tokens for consistency
<div style={{ padding: 'var(--space-4)' }}>

// Use Tailwind for rapid development
<div className="p-4 bg-white rounded-lg shadow-md">

// Compose components for complex layouts
<Card>
  <CardHeader title="Details" />
  <Input label="Name" />
</Card>

// Use semantic colors
<div className="bg-elevated text-primary">
```

### Don'ts ❌

```tsx
// Avoid hardcoded values
<div style={{ padding: '16px' }}>  // ❌
<div style={{ padding: 'var(--space-4)' }}>  // ✅

// Avoid arbitrary colors
<div style={{ color: '#333' }}>  // ❌
<div style={{ color: 'var(--text-primary)' }}>  // ✅

// Avoid magic numbers
<button style={{ width: 'calc(100% - 32px)' }}>  // ❌
```

---

## Migration Guide

### From Inline Styles to Design Tokens

**Before:**
```tsx
<div style={{
  padding: '16px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
}}>
```

**After:**
```tsx
<div className="p-4 bg-white rounded-lg shadow-md">
// or
<div style={{
  padding: 'var(--space-4)',
  backgroundColor: 'var(--bg-elevated)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)'
}}>
```

### From Custom Button Styles to Button Component

**Before:**
```tsx
<button
  style={{
    padding: '12px 24px',
    backgroundColor: '#3B82F6',
    color: 'white',
    borderRadius: '8px',
    fontWeight: '600'
  }}
>
  Submit
</button>
```

**After:**
```tsx
<Button variant="primary">
  Submit
</Button>
```
