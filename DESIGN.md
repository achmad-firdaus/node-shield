# Node Shield - Design System

## Visual Design

### Color Palette

**Primary Colors:**
- Accent Red: `#ff6b6b` (danger, critical alerts)
- Accent Orange: `#ff922b` (warnings, highlights)
- Accent Green: `#51cf66` (success, safe)
- Accent Yellow: `#ffd93d` (medium severity)

**Background:**
- Deep Navy: `#0a0e27` (main background)
- Dark Blue: `#1a1f3a` (gradient end)
- Slate: `#1a1f2e` (cards/containers)

**Text:**
- Primary: `#e0e6ed` (main text)
- Secondary: `#999` (labels, captions)
- Muted: `#666` (disabled, footer)

### Typography

**Font Stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'`

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Header H1 | 28px | 700 | Main title |
| Stat Numbers | 48px | 800 | Large metrics |
| Table Headers | 12px | 700 | Column titles |
| Body | 13-14px | 400 | Main content |
| Labels | 12px | 600 | Stat labels |

### Components

#### Stat Cards
- **Background:** Glassmorphic (rgba with backdrop blur)
- **Border:** Subtle rgba border with hover effect
- **Top Border:** 3px gradient bar (red → orange)
- **Hover:** Lift effect + glow shadow
- **Animation:** Staggered slideIn on load

#### Severity Badges
| Severity | Color | Background | Meaning |
|----------|-------|-----------|---------|
| CRITICAL | #ff6b6b | rgba(255, 107, 107, 0.15) | RCE, XXE, Rate Limited |
| HIGH | #ff922b | rgba(255, 146, 43, 0.15) | SQL Injection, NoSQL |
| MEDIUM | #ffd93d | rgba(255, 217, 61, 0.15) | Path Traversal, LDAP |
| LOW | #51cf66 | rgba(81, 207, 102, 0.15) | XSS |

#### Tables
- **Header:** Dark background with uppercase labels
- **Rows:** Hover state with background shift
- **Borders:** Minimal, subtle rgba dividers

#### Interactive Elements
- **Buttons:** Gradient background with shadow
- **Hover Effects:** Transform (translateY), shadow increase
- **Transitions:** 0.3s ease for smooth effects

### Layout

**Grid System:**
- Max width: 1400px
- Padding: 30px sides, 40px top/bottom
- Stat cards: Auto-fit grid, min 180px columns

**Spacing Scale:**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 30px
- 2xl: 40px

### Effects & Animations

**Animations:**
1. **Pulse** — Status indicator (2s loop)
2. **SlideIn** — Cards on load (staggered 0.1-0.6s)
3. **FadeIn** — Tab content (0.3s)
4. **Hover Lift** — Cards on hover (6px translateY)

**Backdrop Blur:**
- Header: `blur(10px)`
- Cards: `blur(10px)`
- Creates glassmorphic effect over gradient background

### Responsive Design

**Breakpoints:**
- Desktop: 1400px max (full features)
- Tablet: 768px → mobile layout
- Mobile: <768px
  - Header: Stack vertically
  - Stats: 2 columns
  - Tabs: Horizontal scroll

## Design Philosophy

**Principles:**

1. **Data Clarity** — Stats presented clearly with visual hierarchy
2. **Security Visual Language** — Red/orange for threats, green for safe
3. **Modern Aesthetic** — Glassmorphism, gradients, smooth animations
4. **Performance First** — CSS animations (GPU accelerated), minimal JS
5. **Accessibility** — Good contrast, clear typography, keyboard navigable

## Component Library

### Ready-to-Use Components
- Stat card with number + label
- Severity badge system
- Tabbed interface
- Data table with hover
- Attacker card list
- Status indicator with pulse

## Future Enhancements

- [ ] Dark/light mode toggle
- [ ] Custom color themes
- [ ] SVG charts for trends
- [ ] Export dashboard as PDF
- [ ] Mobile app version
- [ ] Real-time animation updates
- [ ] Customizable dashboard widgets

## Figma/Design Files

Current design is CSS-only (no Figma file yet). All styles are in `dashboard.html` `<style>` tag.

To maintain design consistency:
1. Keep gradient colors consistent
2. Use 12px minimum for typography
3. Follow animation timing (0.3s ease standard)
4. Maintain 20px gap spacing in grids
5. Use backdrop-filter: blur(10px) for glassmorphic elements

