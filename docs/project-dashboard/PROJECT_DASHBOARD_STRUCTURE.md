# Project Management Dashboard - Visual Structure

## 📐 Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROJECT MANAGEMENT DASHBOARD                     │
│                     High-level overview of project activities            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │    📋    │  │    💻    │  │    ✅    │  │    👥    │  │    🚀    │ │
│  │    8     │  │    12    │  │    5     │  │    3     │  │    2     │ │
│  │Blueprint │  │   Dev    │  │   UAT    │  │ EUT/SIT  │  │ Go-Live  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                    Widget 1: Project Stage Funnel                        │
│                                                                           │
├───────────────────────────────────────────┬───────────────────────────────┤
│                                           │                               │
│  ┌─────────────────────────────────────┐ │  ┌─────────────────────────┐ │
│  │   PROJECT PROGRESS OVERVIEW         │ │  │   SUPPORT TICKETS       │ │
│  ├─────────────────────────────────────┤ │  ├─────────────────────────┤ │
│  │                                     │ │  │  ┌───────────────────┐  │ │
│  │  ┌─ Sistem Informasi Akademik ───┐ │ │  │  │  🔔 Tiket Terbuka │  │ │
│  │  │  On Track                      │ │ │  │  │       24          │  │ │
│  │  │  Milestone: UI Slicing         │ │ │  │  └───────────────────┘  │ │
│  │  │  [████████████░░░░] 75%        │ │ │  │                         │ │
│  │  │  👤👤👤                         │ │ │  │  ┌───────────────────┐  │ │
│  │  └────────────────────────────────┘ │ │  │  │  ✅ Tiket Selesai │  │ │
│  │                                     │ │  │  │      156          │  │ │
│  │  ┌─ E-Commerce Platform ──────────┐ │ │  │  └───────────────────┘  │ │
│  │  │  At Risk                       │ │ │  │                         │ │
│  │  │  Milestone: Backend API Dev    │ │ │  │    ╭─────────╮         │ │
│  │  │  [██████░░░░░░░░░] 45%         │ │ │  │   ╱         ╲        │ │
│  │  │  👤👤                           │ │ │  │  │    180    │        │ │
│  │  └────────────────────────────────┘ │ │  │   ╲         ╱        │ │
│  │                                     │ │  │    ╰─────────╯         │ │
│  │  ┌─ Mobile Banking App ───────────┐ │ │  │   Donut Chart          │ │
│  │  │  On Track                      │ │ │  └─────────────────────────┘ │
│  │  │  Milestone: Final Testing      │ │                                │
│  │  │  [████████████████░] 90%       │ │  ┌─────────────────────────┐ │
│  │  │  👤👤👤                         │ │  │ ⚠️ TASK LEWAT TENGGAT  │ │
│  │  └────────────────────────────────┘ │ │  ├─────────────────────────┤ │
│  │                                     │ │  │                         │ │
│  │  ┌─ Inventory Management ─────────┐ │ │  │ 📌 Complete API Docs   │ │
│  │  │  Delayed                       │ │ │  │    E-Commerce Platform │ │
│  │  │  Milestone: Database Design    │ │ │  │    🔴 3 days overdue   │ │
│  │  │  [████░░░░░░░░░░░] 30%         │ │ │  │                         │ │
│  │  │  👤👤                           │ │ │  │ 📌 Fix Auth Bug        │ │
│  │  └────────────────────────────────┘ │ │  │    Mobile Banking App  │ │
│  │                                     │ │  │    🔴 1 day overdue    │ │
│  │  ┌─ HR Management Portal ─────────┐ │ │  │                         │ │
│  │  │  On Track                      │ │ │  │ 📌 Database Migration  │ │
│  │  │  Milestone: Module Integration │ │ │  │    Inventory Mgmt      │ │
│  │  │  [██████████░░░░░] 60%         │ │ │  │    🔴 5 days overdue   │ │
│  │  │  👤👤👤                         │ │ │  │                         │ │
│  │  └────────────────────────────────┘ │ │  │ 📌 UI Review Meeting   │ │
│  │                                     │ │  │    HR Management       │ │
│  │  View All →                        │ │  │    🔴 2 days overdue   │ │
│  └─────────────────────────────────────┘ │  └─────────────────────────┘ │
│           Widget 2: Project Progress      │   Widget 3 & 4: Tickets &   │
│                                           │      Overdue Tasks           │
└───────────────────────────────────────────┴───────────────────────────────┘
```

---

## 🎨 Color Coding Legend

### **Project Stages (Widget 1)**
- 🔵 **Blueprint** - Blue gradient
- 🟣 **Development** - Purple gradient  
- 🟠 **UAT** - Orange gradient
- 🔷 **EUT/SIT** - Teal gradient
- 🟢 **Go-Live** - Green gradient

### **Project Status (Widget 2)**
- 🟢 **On Track** - Green badge
- 🟡 **At Risk** - Orange badge
- 🔴 **Delayed** - Red badge

### **Progress Bars (Widget 2)**
- 🟢 **75-100%** - Green
- 🔵 **50-74%** - Blue
- 🟠 **25-49%** - Orange
- 🔴 **0-24%** - Red

### **Support Tickets (Widget 3)**
- 🟠 **Open Tickets** - Orange background
- 🟢 **Completed Tickets** - Green background

### **Overdue Tasks (Widget 4)**
- 🔴 **All Items** - Red accents (critical alert)

---

## 📊 Grid Layout Breakdown

### **Desktop (1024px+)**
```
┌─────────────────────────────────────────────────┐
│              12-Column Grid System               │
├─────────────────────────────────────────────────┤
│                                                  │
│  [2.4] [2.4] [2.4] [2.4] [2.4]  ← Stage Cards   │
│                                                  │
│  [────────8────────] [────4────]  ← Main Content │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **Tablet (640px - 1023px)**
```
┌───────────────────────────┐
│     12-Column Grid        │
├───────────────────────────┤
│                           │
│  [──6──] [──6──]          │
│  [──6──] [──6──]          │
│  [──6──]                  │
│                           │
│  [────────12────────]     │
│                           │
│  [────────12────────]     │
│                           │
└───────────────────────────┘
```

### **Mobile (< 640px)**
```
┌─────────────┐
│  12-Column  │
├─────────────┤
│             │
│  [───12──]  │
│  [───12──]  │
│  [───12──]  │
│  [───12──]  │
│  [───12──]  │
│             │
│  [───12──]  │
│             │
│  [───12──]  │
│             │
│  [───12──]  │
│             │
└─────────────┘
```

---

## 🔄 Component Hierarchy

```
ProjectDashboardPage (Client Component)
│
├── Page Header
│   ├── Title: "Project Management Dashboard"
│   ├── Subtitle: "High-level overview..."
│   └── Last Updated Timestamp
│
├── Widget 1: Project Stage Funnel
│   ├── Blueprint Card (Button)
│   ├── Development Card (Button)
│   ├── UAT Card (Button)
│   ├── EUT/SIT Card (Button)
│   └── Go-Live Card (Button)
│
├── Main Content Grid (2 columns on desktop)
│   │
│   ├── Left Column (2/3 width)
│   │   └── Widget 2: Project Progress Overview
│   │       ├── Header with "View All" link
│   │       └── Project Cards (5 items)
│   │           ├── Project Name
│   │           ├── Status Badge
│   │           ├── Current Milestone
│   │           ├── Progress Bar (with shimmer)
│   │           └── Team Avatars
│   │
│   └── Right Column (1/3 width)
│       ├── Widget 3: Support Ticket Snapshot
│       │   ├── Open Tickets Card
│       │   ├── Completed Tickets Card
│       │   └── Donut Chart Visualization
│       │
│       └── Widget 4: Overdue Task Reminders
│           ├── Alert Header (Red)
│           └── Scrollable Task List
│               └── Task Items (4 items)
│                   ├── Task Name
│                   ├── Project Name
│                   └── Days Overdue Badge
│
└── Helper Functions
    ├── getProgressColor()
    └── getStatusBadge()
```

---

## 🎯 Interactive States

### **Stage Cards (Widget 1)**
```
Default State:
- Border: Gray (border-gray-200)
- Scale: 1.0
- Shadow: None

Hover State:
- Scale: 1.05
- Shadow: Large (shadow-lg)
- Transition: 300ms

Selected State:
- Border: Brand Blue (border-brand-500)
- Shadow: Large (shadow-lg)
- Persistent highlight
```

### **Project Cards (Widget 2)**
```
Default State:
- Background: White/Gray-800
- Border: Gray-200/Gray-700

Hover State:
- Background: Gray-50/Gray-700/50
- Transition: Smooth color change
```

### **Progress Bars**
```
Animation:
- Shimmer overlay (2s infinite)
- Gradient: Transparent → White/20 → Transparent
- Transform: translateX(-100% to 100%)
```

### **Task Items (Widget 4)**
```
Default State:
- Background: Red-50/Red-900/10

Hover State:
- Background: Red-100/Red-900/20
- Cursor: Pointer
```

---

## 📱 Responsive Behavior

### **Stage Cards**
- **Mobile:** Stack vertically (1 column)
- **Tablet:** 2 columns
- **Desktop:** 5 columns (equal width)

### **Main Content**
- **Mobile:** Single column, full width
- **Tablet:** Single column, full width
- **Desktop:** 2:1 ratio (Project Progress : Sidebar)

### **Typography Scaling**
- **Mobile:** Smaller font sizes
- **Tablet:** Medium font sizes
- **Desktop:** Full font sizes

---

## 🎨 Design Tokens

### **Spacing**
```css
Gap between stage cards: 1rem (gap-4)
Gap between sections: 1.5rem (gap-6)
Card padding: 1.5rem (p-6)
Card border radius: 0.75rem (rounded-xl)
```

### **Shadows**
```css
Default cards: shadow-sm
Hover cards: shadow-lg
Alert card: shadow-sm with colored border
```

### **Borders**
```css
Default: 1px solid (border)
Alert: 2px solid (border-2)
Colors: gray-200 / gray-700 (dark mode)
```

### **Transitions**
```css
Duration: 300ms (default)
Easing: ease-in-out
Properties: all, transform, colors
```

---

## 🔧 Technical Notes

### **State Management**
- `selectedStage`: Tracks which stage card is selected
- Local state only (no global state needed)
- Simple toggle logic for filtering

### **Performance**
- Client-side rendering for interactivity
- No heavy computations
- CSS animations use GPU acceleration
- Minimal re-renders

### **Accessibility**
- Semantic HTML (`<button>`, `<nav>`, etc.)
- Proper heading hierarchy (h1, h2, h3)
- Color contrast ratios meet WCAG AA
- Keyboard navigation support

### **Browser Support**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox
- SVG support required
- CSS animations support required

---

## 📝 File Structure

```
src/app/(admin)/project-dashboard/
├── page.tsx          # Main dashboard component (460+ lines)
│   ├── Imports & Types
│   ├── Dummy Data
│   ├── Helper Functions
│   ├── Main Component
│   └── JSX Structure
│
└── layout.tsx        # Metadata wrapper (15 lines)

src/app/globals.css
└── Shimmer animation (@keyframes)

src/layout/AppSidebar.tsx
└── Navigation menu item
```

---

## 🚀 Quick Start

1. **Navigate to dashboard:**
   ```
   Click "Project Dashboard" in sidebar
   OR
   Visit: http://localhost:3000/project-dashboard
   ```

2. **Interact with widgets:**
   - Click stage cards to filter
   - Hover over projects to see details
   - Scroll through overdue tasks
   - View support ticket breakdown

3. **Responsive testing:**
   - Resize browser window
   - Test on mobile devices
   - Check dark mode toggle

---

**Last Updated:** October 1, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready (Frontend)
