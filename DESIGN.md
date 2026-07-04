# StratosERP Design System

## 1. Atmosphere & Identity

StratosERP should feel like an institutional editorial command centre: severe, precise, and quietly authoritative. The signature is **architectural contrast** — oversized serif typography, heavy black rules, and stark monochrome surfaces that make even dense academic workflows feel curated rather than cluttered.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--background` | `#FFFFFF` | `#000000` | App background |
| Surface/secondary | `--muted` | `#F5F5F5` | `#111111` | Soft panels and grouped zones |
| Surface/elevated | `--card` | `#FFFFFF` | `#000000` | Cards and data panels |
| Text/primary | `--foreground` | `#000000` | `#FFFFFF` | Headings and body text |
| Text/secondary | `--muted-foreground` | `#525252` | `#D4D4D4` | Supporting copy |
| Text/inverse | `--accent-foreground` | `#FFFFFF` | `#000000` | Text on inverted surfaces |
| Border/default | `--border` | `#000000` | `#FFFFFF` | Main borders and rules |
| Border/subtle | `--border-light` | `#E5E5E5` | `#262626` | Hairlines and dividers |
| Accent/primary | `--accent` | `#000000` | `#FFFFFF` | Active surfaces, buttons, focus |
| Ring | `--ring` | `#000000` | `#FFFFFF` | Focus outlines |

### Rules

- The palette is strictly monochrome. No decorative colour may be introduced.
- Black is the accent. Emphasis comes from inversion, line weight, and scale.
- Status messaging stays monochrome; urgency is communicated by wording and border treatment, not hue.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display/XL | `clamp(5rem, 12vw, 10rem)` | 700 | 0.92 | `-0.05em` | Hero statements |
| Display | `clamp(3.5rem, 8vw, 6rem)` | 700 | 0.95 | `-0.04em` | Page-level statements |
| H1 | `3.5rem / 56px` | 700 | 1 | `-0.03em` | Page titles |
| H2 | `2.5rem / 40px` | 600 | 1.05 | `-0.025em` | Section titles |
| H3 | `2rem / 32px` | 600 | 1.15 | `-0.015em` | Panel headings |
| Lead | `1.25rem / 20px` | 400 | 1.65 | `0` | Introductions |
| Body | `1rem / 16px` | 400 | 1.65 | `0` | Standard text |
| Body/sm | `0.875rem / 14px` | 400 | 1.55 | `0` | Secondary text |
| Caption | `0.75rem / 12px` | 500 | 1.4 | `0.08em` | Labels, metadata |
| Overline | `0.75rem / 12px` | 600 | 1.3 | `0.16em` | Uppercase section markers |

### Font Stack

- Primary display: `"Playfair Display", Georgia, serif`
- Primary body: `"Source Serif 4", Georgia, serif`
- Mono: `"JetBrains Mono", monospace`

### Rules

- Headlines use the display serif and carry the visual weight of the interface.
- Body copy uses the body serif for an editorial reading texture.
- Mono is reserved for labels, metadata, timings, route IDs, and technical response surfaces.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of **4px**.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Hairline spacing |
| `--space-2` | `8px` | Tight inline gaps |
| `--space-3` | `12px` | Compact control padding |
| `--space-4` | `16px` | Default row spacing |
| `--space-5` | `20px` | Small panel breathing room |
| `--space-6` | `24px` | Default card padding |
| `--space-8` | `32px` | Between panel groups |
| `--space-10` | `40px` | Local section breaks |
| `--space-12` | `48px` | Major panel breaks |
| `--space-16` | `64px` | Route-level rhythm |
| `--space-20` | `80px` | Hero spacing |
| `--space-24` | `96px` | Maximum section separation |

### Grid

- Max content width: `72rem / 1152px` for editorial pages, `80rem / 1280px` for dashboard shells
- Column system: 12-column grid with strong vertical rules and generous negative space
- Breakpoints: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`, `2xl 1536px`

### Rules

- Use thick horizontal rules between major sections.
- Mobile layouts may stack, but must retain the same hard-edged hierarchy.
- No spacing values outside this scale without updating this file first.

## 5. Components

### Editorial Button
- **Structure**: rectangular button or link with uppercase label and optional trailing arrow
- **Variants**: primary (inverted), secondary (outlined), ghost (text-like)
- **Spacing**: `--space-3` vertical, `--space-6` horizontal minimum
- **States**: default, hover inversion, focus-visible outline, disabled dimming
- **Accessibility**: 44px minimum target, keyboard focus ring required
- **Motion**: 100ms maximum colour/border transition

### Form Field
- **Structure**: overline label + input/select/textarea + optional supporting text
- **Variants**: single-line input, select, textarea, upload field
- **Spacing**: `--space-2` label gap, `--space-3` internal padding
- **States**: default, hover, focus-visible border thickening, disabled
- **Accessibility**: explicit label binding, placeholder never sole instruction
- **Motion**: instant or 100ms border/background shift

### Monochrome Panel
- **Structure**: bordered rectangular container with optional kicker, heading, body, footer
- **Variants**: default panel, inverted panel, data card, payload response card
- **Spacing**: `--space-6` default interior, `--space-8` for feature panels
- **States**: default, hover inversion where interactive, focused if clickable
- **Accessibility**: semantic heading order, visible hover/focus only where interactive
- **Motion**: 100ms colour inversion or border thickening

### Dashboard Rail
- **Structure**: vertical section list with title, detail, active state, and rule separators
- **Variants**: sticky desktop rail, stacked mobile rail
- **Spacing**: `--space-3` item padding, `--space-4` between groups
- **States**: default, active inverted, hover underline/border emphasis, focus-visible outline
- **Accessibility**: buttons remain keyboard navigable and visibly selected
- **Motion**: 100ms inversion only

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | `100ms` | `linear` | Buttons, toggles, hover inversions |
| Standard | `100ms` | `linear` | Panel state changes |
| Emphasis | `200ms` | `ease-out` | Image or chart emphasis only |

### Rules

- Prefer stillness. Motion exists only to confirm interaction.
- Animate only `transform`, `opacity`, `border-width`, and colour transitions.
- Respect `prefers-reduced-motion` by removing non-essential transforms.

## 7. Depth & Surface

### Strategy

Commitment: **borders-only**

| Type | Value | Usage |
|------|-------|-------|
| Hairline | `1px solid var(--border-light)` | Fine dividers |
| Default | `1px solid var(--border)` | Standard cards, tables, controls |
| Emphasis | `2px solid var(--border)` | Buttons, important panels |
| Section rule | `4px solid var(--border)` | Major section boundaries |
| Hero rule | `8px solid var(--border)` | High-drama separators |

### Rules

- No shadows anywhere in the interface.
- All corners are `0px`.
- Texture layers (horizontal rules, paper noise, subtle grids) provide depth instead of gradients or blur.
