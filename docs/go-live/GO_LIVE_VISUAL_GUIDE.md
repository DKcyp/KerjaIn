# Go-Live Command Center - Visual Design Guide

## Color System

### Status Colors
```
ON SCHEDULE  → bg-green-500   (#10B981)
DELAYED      → bg-orange-500  (#F97316)
DONE         → bg-blue-500    (#3B82F6)
FAILED       → bg-red-500     (#EF4444)
IN PROGRESS  → border-orange-500 (spinning animation)
```

### Background Colors
```
Primary BG   → bg-gray-900    (#111827)
Card BG      → bg-gray-800    (#1F2937)
Hover BG     → bg-gray-750    (#1A2332)
Border       → border-gray-700 (#374151)
```

### Text Colors
```
Primary Text → text-white     (#FFFFFF)
Secondary    → text-gray-400  (#9CA3AF)
Muted        → text-gray-500  (#6B7280)
Success      → text-green-400 (#34D399)
Warning      → text-orange-400 (#FB923C)
Error        → text-red-400   (#F87171)
```

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     MAIN HEADER / STATUS BAR                    │
│  ┌──────────────────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Go-Live: Project Alpha   │  │ 00:45:23 │  │ ON SCHEDULE  │  │
│  │ Jadwal: 1 Okt 2025 23:00 │  │ COUNTDOWN│  │              │  │
│  └──────────────────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐  ┌─────────────────┐
│         GO-LIVE CHECKLIST                │  │  ACTIVITY LOG   │
│  ┌────────────────────────────────────┐  │  │  ┌───────────┐  │
│  │ ▼ Pra Go-Live            4 / 5     │  │  │  │ SA 22:15  │  │
│  │  ✓ Backup server database          │  │  │  │ Backup... │  │
│  │  ✓ Verify backup integrity         │  │  │  ├───────────┤  │
│  │  ✓ Notify stakeholders             │  │  │  │ SA 22:18  │  │
│  │  ✓ Prepare rollback scripts        │  │  │  │ Backup... │  │
│  │  ⟳ Review deployment checklist     │  │  │  ├───────────┤  │
│  └────────────────────────────────────┘  │  │  │ BS 22:30  │  │
│                                           │  │  │ Email...  │  │
│  ┌────────────────────────────────────┐  │  │  └───────────┘  │
│  │ ▼ Saat Go-Live           0 / 6     │  │  │                 │
│  │  ○ Stop application services       │  │  │  ┌───────────┐  │
│  │  ○ Deploy new version              │  │  │  │ [Comment] │  │
│  │  ○ Run database migrations         │  │  │  │ [  Send ] │  │
│  │  ○ Update DNS records              │  │  │  └───────────┘  │
│  │  ○ Start application services      │  │  └─────────────────┘
│  │  ○ Verify application startup      │  │
│  └────────────────────────────────────┘  │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │ ▶ Pasca Go-Live          0 / 5     │  │
│  └────────────────────────────────────┘  │
│                                           │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │ KEY CONTACTS │  │ EMERGENCY ACTIONS│  │
│  │ ● BS Online  │  │  ⚠ RENCANA      │  │
│  │ ● SA Online  │  │    ROLLBACK     │  │
│  │ ○ AR Offline │  │                  │  │
│  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Header Section
```
┌─────────────────────────────────────────────────────────┐
│  Go-Live: Project Alpha                                 │
│  Jadwal: 1 Okt 2025, 23:00 WIB                         │
│                                                          │
│  ┌──────────────┐  ┌─────────────────────────────┐     │
│  │ TIME TO      │  │                             │     │
│  │ GO-LIVE      │  │      ON SCHEDULE            │     │
│  │              │  │                             │     │
│  │  00:45:23    │  └─────────────────────────────┘     │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

**Typography**:
- Title: `text-3xl md:text-4xl font-bold`
- Subtitle: `text-sm md:text-base text-gray-400`
- Countdown: `text-3xl font-mono font-bold text-blue-400`
- Status Badge: `text-xl font-bold tracking-wide`

---

### 2. Checklist Task Item
```
┌──────────────────────────────────────────────────────┐
│  ✓  Backup server database                           │
│     SA  Siti Aminah  ✓ 22:15:00 WIB  [Done ▼]       │
└──────────────────────────────────────────────────────┘
```

**States**:
- **Pending**: Empty circle `○`, normal text
- **In Progress**: Spinning circle `⟳`, normal text
- **Done**: Green checkmark `✓`, gray strikethrough text
- **Failed**: Red X `✗`, red text

**Avatar Badge**: 
- Circle with initials
- `bg-blue-600 text-white`
- `w-5 h-5 text-xs`

---

### 3. Activity Log Entry
```
┌────────────────────────────────────────┐
│  SA  Siti Aminah       22:15:00 WIB    │
│      menandai "Backup server database" │
│      sebagai Selesai.                  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  SA  Siti Aminah       22:18:00 WIB    │
│      Backup berhasil. Size: 2.3 GB.    │
│      Lokasi: /backups/prod.sql         │
└────────────────────────────────────────┘
```

**Differentiation**:
- Auto logs: `bg-gray-800`
- Manual comments: `bg-gray-750` (slightly darker)

---

### 4. Key Contact Card
```
┌─────────────────────────┐
│  Key Contacts           │
├─────────────────────────┤
│  BS  Budi Santoso    ●  │
│      Release Manager     │
│                          │
│  SA  Siti Aminah     ●  │
│      Lead DevOps         │
│                          │
│  AR  Ahmad Rizki     ○  │
│      Tech Lead           │
└─────────────────────────┘
```

**Status Indicators**:
- Online: Green dot `●` (`bg-green-500`)
- Offline: Gray dot `○` (`bg-gray-500`)

---

### 5. Rollback Button
```
┌─────────────────────────┐
│  Emergency Actions      │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │   ⚠               │  │
│  │  RENCANA ROLLBACK │  │
│  │                   │  │
│  └───────────────────┘  │
│  Akses prosedur         │
│  rollback darurat       │
└─────────────────────────┘
```

**Styling**:
- Background: `bg-red-600 hover:bg-red-700`
- Text: `text-white font-bold`
- Icon: Warning triangle

---

## Responsive Breakpoints

### Desktop (≥1024px)
```
┌────────────────────────────────────────────────┐
│              HEADER (full width)               │
├──────────────────────────────┬─────────────────┤
│                              │                 │
│     CHECKLIST (66%)          │  ACTIVITY (33%) │
│                              │                 │
│  ┌────────────────────────┐  │  ┌───────────┐  │
│  │ Pra Go-Live            │  │  │ Log Feed  │  │
│  │ Saat Go-Live           │  │  │           │  │
│  │ Pasca Go-Live          │  │  │           │  │
│  └────────────────────────┘  │  └───────────┘  │
│                              │                 │
│  ┌──────────┬──────────────┐ │                 │
│  │ Contacts │ Rollback     │ │                 │
│  └──────────┴──────────────┘ │                 │
└──────────────────────────────┴─────────────────┘
```

### Tablet (768px - 1023px)
```
┌────────────────────────────────┐
│        HEADER (stacked)        │
├────────────────────────────────┤
│                                │
│     CHECKLIST (full width)     │
│                                │
├────────────────────────────────┤
│  ┌──────────┬──────────────┐   │
│  │ Contacts │ Rollback     │   │
│  └──────────┴──────────────┘   │
├────────────────────────────────┤
│                                │
│   ACTIVITY LOG (full width)    │
│                                │
└────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────┐
│     HEADER       │
│   (stacked)      │
├──────────────────┤
│                  │
│   CHECKLIST      │
│   (full width)   │
│                  │
├──────────────────┤
│   CONTACTS       │
│   (full width)   │
├──────────────────┤
│   ROLLBACK       │
│   (full width)   │
├──────────────────┤
│                  │
│  ACTIVITY LOG    │
│  (reduced height)│
│                  │
└──────────────────┘
```

---

## Animation & Transitions

### Countdown Timer
- Updates: Every 1 second
- Animation: None (smooth number change)
- Font: Monospace for alignment

### In-Progress Spinner
```css
.animate-spin {
  animation: spin 1s linear infinite;
}
```
- Border: `border-2 border-orange-500`
- Top border: `border-t-transparent`

### Phase Expand/Collapse
```css
transition: height 300ms ease-in-out
```
- Chevron rotates 180° when expanded
- Smooth height transition

### Hover Effects
- Cards: `hover:bg-gray-750`
- Buttons: `hover:bg-blue-700`
- Transitions: `transition-colors duration-200`

---

## Icon Library

All icons are inline SVG from Heroicons:

### Status Icons
- **Checkmark**: `M5 13l4 4L19 7`
- **X (Failed)**: `M6 18L18 6M6 6l12 12`
- **Warning**: `M12 9v2m0 4h.01m-6.938 4h13.856...`

### UI Icons
- **Lightning (Go-Live)**: `M13 10V3L4 14h7v7l9-11h-7z`
- **Chevron Down**: `M19 9l-7 7-7-7`
- **Send**: `M12 19l9 2-9-18-9 18 9-2zm0 0v-8`

---

## Typography Scale

```
Hero (Project Title):     text-3xl md:text-4xl (30px/36px → 36px/40px)
Large (Status Badge):     text-xl (20px/28px)
Medium (Section Headers): text-lg (18px/28px)
Base (Body Text):         text-sm (14px/20px)
Small (Timestamps):       text-xs (12px/16px)
```

**Font Families**:
- Default: System font stack
- Monospace (Countdown): `font-mono`

---

## Spacing System

```
Container Padding:  p-4 md:p-6 (16px → 24px)
Card Padding:       p-6 (24px)
Section Gap:        gap-6 (24px)
Item Gap:           gap-3 (12px)
Border Radius:      rounded-lg (8px)
```

---

## Shadow System

```
Card Shadow:   shadow-xl
Button Shadow: shadow-lg
Header Shadow: shadow-2xl
```

---

## Accessibility Features

### Color Contrast
- All text meets WCAG AA standards
- High contrast mode compatible

### Keyboard Navigation
- Tab through interactive elements
- Enter to submit comments
- Space to toggle checkboxes

### Screen Readers
- Semantic HTML (`<nav>`, `<main>`, `<section>`)
- ARIA labels on icons
- Status announcements

---

## Print Styles (Future)

For printing deployment reports:
- Remove dark backgrounds
- Black text on white
- Page breaks between sections
- Include timestamps
- Exclude interactive elements

---

## Performance Optimizations

### Rendering
- React.memo for task items
- useCallback for event handlers
- Debounced scroll events

### Data
- Virtualized lists for 100+ tasks
- Lazy load old activity logs
- Optimistic UI updates

---

## Browser-Specific Notes

### Safari
- Tested on iOS Safari 15+
- Smooth scrolling supported
- Touch gestures optimized

### Firefox
- CSS Grid fully supported
- Animations smooth
- Dark mode compatible

### Chrome/Edge
- Best performance
- All features supported
- DevTools friendly

---

## Design Tokens (Future)

For design system integration:

```javascript
const tokens = {
  colors: {
    status: {
      onSchedule: '#10B981',
      delayed: '#F97316',
      done: '#3B82F6',
      failed: '#EF4444'
    },
    background: {
      primary: '#111827',
      secondary: '#1F2937',
      tertiary: '#374151'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem'
  }
}
```

---

## Conclusion

This visual guide provides a comprehensive reference for the Go-Live Command Center's design system. All measurements, colors, and layouts are optimized for the mission control aesthetic while maintaining usability and accessibility.

**Design Status**: ✅ Complete and Production-Ready
