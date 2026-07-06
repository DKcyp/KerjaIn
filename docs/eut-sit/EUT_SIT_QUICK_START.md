# EUT/SIT Management System - Quick Start Guide

## 🚀 Quick Start

This guide will help you quickly view and interact with the EUT/SIT Management System UI mockup.

---

## 📂 What Was Created

### Pages (3 Screens)
1. **Dashboard** - `/eut-sit/page.tsx`
2. **Test Plan Detail** - `/eut-sit/[id]/page.tsx`
3. **Test Execution** - `/eut-sit/[id]/scenario/[scenarioId]/page.tsx`

### Components (3 Reusable)
1. **StatusBadge** - `components/eutSit/StatusBadge.tsx`
2. **ProgressBar** - `components/eutSit/ProgressBar.tsx`
3. **SeverityIndicator** - `components/eutSit/SeverityIndicator.tsx`

### Navigation
- **Sidebar** - Updated `layout/AppSidebar.tsx` with EUT/SIT menu item

---

## 🎯 How to View the UI

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Navigate to EUT/SIT
Open your browser and go to:
```
http://localhost:3000/eut-sit
```

Or click **"EUT/SIT"** in the sidebar navigation.

### Step 3: Explore the Interface

#### Dashboard View
- View all test plans in the table
- See statistics cards at the top
- Click on any test plan row to view details

#### Test Plan Detail View
- Click on a test plan (e.g., "SIT Rilis Q4 2025")
- Switch between "Skenario Tes" and "Daftar Bug" tabs
- Click on a scenario to execute tests

#### Test Execution View
- Click on a scenario (e.g., "Integrasi Payment Gateway")
- View step-by-step test instructions
- Click "Pass" or "Fail" buttons on steps
- Expand the "Catat Bug/Error" form to log bugs

---

## 🎨 Key Features to Explore

### Visual Elements
✅ **Color-coded status badges** (green, red, orange, yellow)
✅ **Progress bars** with dynamic colors
✅ **Interactive buttons** with hover states
✅ **Collapsible bug form**
✅ **Tabbed interface** for scenarios and bugs
✅ **Statistics cards** with icons
✅ **Breadcrumb navigation**

### Interactive States
- **Hover** over table rows to see highlight
- **Click** buttons to see console logs
- **Expand/collapse** the bug form
- **Switch tabs** to see different content
- **View** conditional approve button (enabled/disabled)

---

## 📊 Mock Data

The UI includes realistic mock data:
- **5 Test Plans** with different statuses
- **4 Test Scenarios** per plan
- **7 Test Steps** per scenario
- **5 Bugs** with various severities

All data is hardcoded for demonstration purposes.

---

## 🎨 Design Highlights

### Color Scheme
- **Blue** - Primary actions, links
- **Green** - Passed, approved
- **Red** - Failed, critical bugs
- **Orange** - In progress
- **Yellow** - Awaiting approval
- **Gray** - Neutral, disabled

### Components
- **Cards** - White background, subtle shadow
- **Tables** - Striped rows, hover effects
- **Buttons** - Color-coded by action type
- **Badges** - Pill-shaped status indicators
- **Forms** - Clean inputs with labels

---

## 🔄 User Flow

```
1. Dashboard
   ↓ Click test plan row
2. Test Plan Detail
   ↓ Click scenario row
3. Test Execution
   ↓ Click Pass/Fail buttons
4. Bug Form (if Fail)
   ↓ Submit bug report
```

---

## 🛠️ Technical Details

### Framework
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling

### File Structure
```
src/
├── app/(admin)/eut-sit/
│   ├── page.tsx                    # Dashboard
│   └── [id]/
│       ├── page.tsx                # Test Plan Detail
│       └── scenario/[scenarioId]/
│           └── page.tsx            # Test Execution
│
├── components/eutSit/
│   ├── StatusBadge.tsx
│   ├── ProgressBar.tsx
│   └── SeverityIndicator.tsx
│
└── layout/
    └── AppSidebar.tsx              # Navigation
```

---

## ⚠️ Important Notes

### This is a UI/UX Mockup Only

**What's Included:**
✅ Visual design and layout
✅ Interactive states (hover, click)
✅ Mock data for demonstration
✅ Component structure
✅ Responsive design

**What's NOT Included:**
❌ Database integration
❌ API endpoints
❌ Data persistence
❌ Authentication
❌ Form validation
❌ File uploads
❌ Real-time updates

### Console Logging
All button clicks and form submissions log to the browser console for demonstration purposes.

---

## 📱 Responsive Design

The UI adapts to different screen sizes:

- **Desktop (>1024px):** Full layout with sidebar
- **Tablet (640-1024px):** Adjusted grid columns
- **Mobile (<640px):** Single column, collapsible sidebar

Test responsiveness by resizing your browser window.

---

## 🎯 Next Steps

### For Designers
1. Review the visual design
2. Provide feedback on colors, spacing, typography
3. Suggest improvements to user flow

### For Developers
1. Review component structure
2. Plan database schema based on mock data
3. Design API endpoints for CRUD operations
4. Implement backend logic

### For Stakeholders
1. Test the user flow
2. Verify it meets business requirements
3. Provide feedback on functionality
4. Approve for development phase

---

## 📖 Additional Documentation

For detailed documentation, see:
- **Full Documentation:** `EUT_SIT_UI_DESIGN_DOCUMENTATION.md`

---

## 🆘 Troubleshooting

### Page Not Found
- Ensure development server is running
- Check the URL: `http://localhost:3000/eut-sit`
- Clear browser cache and refresh

### Styling Issues
- Ensure Tailwind CSS is properly configured
- Check `tailwind.config.js` includes the correct paths
- Restart development server

### Component Errors
- Check browser console for errors
- Ensure all imports are correct
- Verify TypeScript types match

---

## ✅ Checklist

Before presenting to stakeholders:

- [ ] Development server is running
- [ ] Navigate to `/eut-sit` successfully
- [ ] All three screens are accessible
- [ ] Interactive elements work (buttons, tabs, forms)
- [ ] Hover states are visible
- [ ] Status badges display correctly
- [ ] Progress bars animate smoothly
- [ ] Responsive design works on different screen sizes
- [ ] Console logs show for interactions

---

**Ready to explore!** 🎉

Start by navigating to `/eut-sit` and clicking through the interface.
