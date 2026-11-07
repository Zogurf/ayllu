---
name: Civic Horizon
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#ac0031'
  on-tertiary: '#ffffff'
  tertiary-container: '#d71142'
  on-tertiary-container: '#ffecec'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 1.5rem
  margin-md: 3rem
  margin-lg: 5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an authoritative, accessible, and reassuring digital infrastructure for civic engagement, public services, and institutional workflows. Departing from dated bureaucratic aesthetics and heavy government palettes, the interface delivers calm clarity, radical transparency, and friction-free utility.

The aesthetic fuses modern corporate minimalism with high-legibility civic standards. Key visual principles include:
- **Quiet Authority:** Surfaces favor white space, crisp hairline boundaries, and deliberate typography over visual clutter.
- **Immediate Institutional Trust:** Clean modern grotesques convey objectivity, precision, and public accountability.
- **Airy Utility:** Layouts prioritize breathing room, systematic padding hierarchies, and readable line lengths to reduce cognitive fatigue during complex civic interactions.

## Colors

The color architecture eliminates visual noise, replacing legacy bureaucratic tones with an authoritative cobalt primary, deep slate foundational darks, and crisp zinc neutrals.

### Palette Roles
- **Primary (`#2563EB`):** Authoritative Cobalt. Drives primary interactive controls, active states, key data highlights, and prominent links.
- **Secondary (`#0F172A`):** Deep Slate Navy. Used for core text headings, navigation scaffolding, and high-emphasis structure. Paired with Slate-800 (`#1E293B`) for secondary body text.
- **Tertiary / Destructive (`#E11D48`):** Refined Terracotta/Coral. Reserved for civic alerts, critical warnings, urgent notices, and destructive validations.
- **Neutral Surface Palette:**
  - Base White (`#FFFFFF`): Primary elevated cards, modal sheets, and active form controls.
  - Off-White Canvas (`#F8FAFC`): Global application background.
  - Border & Dividers (`#E2E8F0`): Subtle 1px structural dividing lines.
  - Muted Neutral (`#64748B`): Secondary labels, meta-text, and inactive UI iconography.

High-contrast compliance across all color combinations satisfies WCAG 2.1 AA standards as an uncompromising civic baseline.

## Typography

The typographic hierarchy pairs the welcoming, contemporary geometry of **Plus Jakarta Sans** for display titles with the neutral, hyper-legible utility of **Inter** for core prose, forms, and analytical tables.

- **Display & Headings:** Rendered in Plus Jakarta Sans (600/700 weight) with slight negative tracking to preserve structural tightness at scale. Used across hero headers, step-by-step application flows, and modal headers.
- **Body & Data:** Rendered in Inter (400/500 weight) at comfortable line-height multipliers (1.4–1.55) to guarantee reading comfort across diverse age demographics and reading proficiencies.
- **Labels & Microcopy:** Rendered with distinct medium weights (500) to maintain crisp legibility in inputs, tags, and tabular headers.

## Layout & Spacing

Layouts follow a fluid, responsive 12-column grid anchored by an 8pt geometric spacing scale. 

- **Desktop (1280px+):** 12 columns, 32px (`2rem`) gutters, max-width container capped at 1280px with centered fluid page margins. Forms and public service workflows enforce a focused 680px-to-800px column boundary to preserve optimal line length.
- **Tablet (768px – 1024px):** 8 columns, 24px (`1.5rem`) gutters, 32px canvas margins. Secondary sidebar panels collapse into drawer overlays or stacked layouts.
- **Mobile (< 768px):** 4 columns, 16px (`1rem`) gutters, 16px page edge margins. Full-width horizontal form actions and sticky bottom action drawers.
- **Whitespace Doctrine:** Generous inner component padding (`space-lg` to `space-xl`) prevents data density from translating into user anxiety.

## Elevation & Depth

Visual hierarchy relies on crisp surface separation rather than dramatic shadows, reinforcing a light, modern institutional tone.

- **Hairline Framing:** Surface separation begins with 1px low-contrast borders (`#E2E8F0`) surrounding `#FFFFFF` panels on top of the `#F8FAFC` foundation.
- **Ambient Civic Shadows:**
  - *Resting Level (Cards, Containers):* `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`
  - *Elevated Level (Dropdowns, Popovers, Hover states):* `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`
  - *Modal & Drawer Overlay:* `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)` combined with a frosted backdrop wash (`rgba(15, 23, 42, 0.35)` with `backdrop-filter: blur(4px)`).

## Shapes

The design system standardizes on **Level 2 (Rounded)** corners. This curvature delivers approachable warmth while preserving geometric rigor.

- **Base Radius (`rounded`, 0.5rem / 8px):** Applied to form fields, buttons, badges, chips, and small interactive toggles.
- **Large Radius (`rounded-lg`, 1rem / 16px):** Applied to content cards, summary dashboards, list modules, and standard alerts.
- **Extra Large Radius (`rounded-xl`, 1.5rem / 24px):** Reserved for primary hero containers, key landing segments, and overlay modals.
- **Strict Regularity:** Pill shapes are avoided for primary buttons to ensure a grounded, dignified structure; standard 8px corners maintain architectural unity.

## Components

### Buttons
- **Primary:** Filled `#2563EB`, text `#FFFFFF`, 8px border-radius, `0.75rem` vertical by `1.5rem` horizontal padding. Hover shifts to `#1D4ED8`. Focus applies an exterior 2px ring in `#93C5FD` with 2px offset.
- **Secondary:** Surface `#FFFFFF`, border 1px `#E2E8F0`, text `#0F172A`. Hover shifts to `#F8FAFC` with border `#CBD5E1`.
- **Destructive/Alert:** Filled `#E11D48`, text `#FFFFFF`. Hover shifts to `#BE123C`. Focus ring in `#FDA4AF`.

### Form Inputs
- **Base Style:** 1px border `#E2E8F0`, `#FFFFFF` surface, `#0F172A` text, 8px radius. Height is standardized to 44px on desktop and 48px on mobile to guarantee touch target accuracy.
- **States:** Focus replaces border with `#2563EB` paired with an ambient 3px `#DBEAFE` halo. Error state utilizes 1px `#E11D48` border with `#FFE4E6` halo and associated error caption below.

### Cards & Panels
- **Structure:** `#FFFFFF` background, 1px `#E2E8F0` border, 16px (`rounded-lg`) corner radius, and resting ambient shadow. Padding is scaled to 24px (`space-lg`) on mobile and 32px on desktop.

### Chips & Badges
- **Status Tags:** 6px radius, `0.25rem` vertical by `0.75rem` horizontal padding. Font weight 500 (`label-sm`).
  - *Active / Approved:* `#EFF6FF` background, `#1D4ED8` text, 1px `#DBEAFE` border.
  - *Pending / Review:* `#F8FAFC` background, `#475569` text, 1px `#E2E8F0` border.
  - *Urgent / Action Required:* `#FFF1F2` background, `#BE123C` text, 1px `#FECDD3` border.

### Checkboxes & Radio Controls
- **Geometry:** Checkboxes use a 6px border-radius; Radios use full circles. Resting border is 1.5px `#CBD5E1`. Active checked state fills `#2563EB` with `#FFFFFF` glyph iconography.

### Civic Alert Banners
- **Banner Layout:** Surface tint paired with high-contrast text, 16px radius, full-bleed or container-bound with left 4px accent stroke. Includes icon anchor, message title (`title-md`), and inline dismiss or action link.