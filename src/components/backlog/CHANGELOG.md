# Changelog - Backlog Components

## [2.6.0] - 2024-12-03

### 🎯 Simplified Assignment Workflow

#### ✨ Assignment-Only Flow
- **Removed Reassignment**: Hilangkan fitur reassign untuk simplicity
- **One-time Assignment**: Backlog hanya bisa di-assign sekali
- **Clear Status**: Visual yang jelas untuk assigned vs unassigned
- **Task Creation**: Assignment langsung membuat task di tasklist

#### 🛠 UI/UX Simplification
- **Cleaner Interface**: Assignment form hanya muncul untuk unassigned items
- **Status Display**: Clear indication jika sudah assigned dengan task info
- **Focused Workflow**: User fokus pada backlog yang perlu di-assign
- **Reduced Complexity**: Menghilangkan confusion dari reassignment

#### 📱 Enhanced Status Display
- **Assignment Badge**: Clear "Assigned" status dengan user info
- **Task Status**: "Task Created" badge jika sudah menjadi task
- **User Details**: Nama, username, dan jabatan di assignment display
- **Visual Hierarchy**: Better information architecture

#### 🎯 Workflow Benefits
- **Simplified Process**: Assign once, create task, done
- **Clear Ownership**: Tidak ada ambiguity tentang assignment
- **Focused Action**: User tahu exactly apa yang perlu dilakukan
- **Reduced Errors**: Menghilangkan potential confusion dari reassignment

---

## [2.5.0] - 2024-12-03

### 🗄️ Database Schema Enhancement

#### ✨ TasklistId Integration
- **New Field**: Added `tasklistId` column to backlog table
- **Foreign Key**: Proper relationship dengan tasklist table
- **Data Integrity**: Constraint untuk memastikan referential integrity
- **Performance**: Index untuk optimized query performance

#### 🔄 Enhanced Assignment Flow
- **Direct Linking**: Backlog langsung ter-link ke task yang dibuat
- **Improved Tracking**: Lebih akurat dalam tracking task dari backlog
- **Legacy Support**: Fallback ke content-based matching untuk data lama
- **Migration Ready**: Script migration untuk update database schema

#### 🛠 API Improvements
- **Enhanced PUT /api/backlog/[id]**: Support tasklistId field
- **Enhanced POST /api/backlog**: Support tasklistId field  
- **Improved GET /api/backlog/[id]/task**: Direct lookup via tasklistId
- **Backward Compatibility**: Tetap support existing data structure

#### 📋 Migration Support
- **Prisma Schema**: Updated model Backlog dengan tasklistId field
- **Migration Script**: `run-migration.js` dengan Prisma dan manual mode
- **Safe Migration**: Check existing column untuk avoid conflicts
- **Migration Guide**: Comprehensive documentation di `MIGRATION_GUIDE.md`

#### 🎯 Benefits
- **Accurate Tracking**: Exact relationship antara backlog dan task
- **Better Performance**: Direct lookup instead of content matching
- **Data Consistency**: Foreign key constraint untuk data integrity
- **Future Proof**: Schema ready untuk advanced features

---

## [2.4.0] - 2024-12-03

### 🔍 Enhanced Assignment Filtering

#### ✨ Assignment Status Filter
- **Filter Options**: Semua Status, Belum Assigned, Sudah Assigned
- **Visual Indicators**: Badge "Assigned" untuk item yang sudah di-assign
- **Smart Default**: Default filter ke "Belum Assigned" untuk workflow yang efisien
- **Status Overview**: Legend untuk membedakan assigned vs unassigned items

#### 🛠 API Enhancements
- **Enhanced GET /api/backlog**: Support parameter `assigned` dengan nilai:
  - `all`: Menampilkan semua backlog
  - `assigned`: Hanya backlog yang sudah di-assign
  - `unassigned`: Hanya backlog yang belum di-assign (default)
- **Backward Compatibility**: Tetap kompatibel dengan implementasi sebelumnya

#### 📱 UI/UX Improvements
- **Assignment Badges**: Visual indicator di table dan card view
- **Filter Integration**: Assignment filter terintegrasi dengan filter lainnya
- **Status Legend**: Visual guide untuk memahami status assignment
- **Responsive Layout**: Filter assignment responsive di berbagai screen size

#### 🎯 Workflow Benefits
- **Efficient Triage**: PM bisa fokus pada backlog yang belum di-assign
- **Progress Tracking**: Melihat backlog yang sudah menjadi task
- **Team Visibility**: Clear indication item mana yang sudah dalam progress
- **Filter Combination**: Kombinasi filter project + assignment untuk view yang spesifik

---

## [2.3.0] - 2024-12-03

### 🚀 Backlog to Task Conversion

#### ✨ Complete Assignment Workflow
- **Task Creation**: Assignment sekarang otomatis membuat task di tasklist
- **Scheduling**: Input jadwal mulai dan kompleksitas task saat assignment
- **Task Integration**: Backlog langsung terintegrasi dengan sistem tasklist
- **Associated Tasks**: Menampilkan task yang sudah dibuat dari backlog

#### 🛠 Enhanced Assignment Process
- **Multi-step Assignment**: User → Schedule → Complexity → Create Task
- **Task Complexity Options**: Easy (4h), Medium (8h), Hard (16h)
- **SLA Integration**: Otomatis menghitung deadline berdasarkan kompleksitas
- **Real-time Feedback**: Menampilkan task yang terkait dengan backlog

#### 📡 New API Endpoints
- **GET /api/backlog/[id]/task**: Check associated tasks untuk backlog
- **Enhanced Task Creation**: Integrasi dengan existing tasklist API
- **Task Tracking**: Link antara backlog dan task yang dibuat

#### 📱 Improved User Experience
- **Progressive Disclosure**: Assignment form yang bertahap dan jelas
- **Task Visibility**: User bisa melihat task yang sudah dibuat dari backlog
- **Status Indicators**: Clear indication jika backlog sudah menjadi task
- **Workflow Guidance**: Step-by-step process untuk assignment

---

## [2.2.0] - 2024-12-03

### 🏷️ Enhanced Module Display

#### ✨ Smart Module Name Resolution
- **Intelligent Caching**: Otomatis memuat module cache untuk semua project yang ada di backlog
- **Lazy Loading**: ModuleDisplay component yang memuat nama modul secara lazy jika tidak ada di cache
- **Fallback Handling**: Graceful fallback dari nama lengkap → nama singkat → ID modul
- **Loading States**: Visual feedback saat memuat nama modul

#### 🛠 Technical Improvements
- **New API**: `GET /api/modules/[moduleId]` untuk mengambil detail modul individual
- **Utility Functions**: `moduleUtils.ts` dengan helper functions untuk module handling
- **ModuleDisplay Component**: Reusable component dengan lazy loading capability
- **Optimized Caching**: Efficient module cache building dan management

#### 📱 User Experience
- **Proper Names**: Menampilkan nama modul yang sebenarnya, bukan hanya ID
- **Hierarchical Display**: Menampilkan path lengkap modul dengan parent hierarchy
- **Code Integration**: Menampilkan kode modul jika tersedia (e.g., "01.02 — Login Module")
- **Consistent Display**: Format yang konsisten di semua komponen (table, card, detail)

---

## [2.1.0] - 2024-12-03

### 🔄 Assignment Scope Update

#### ✨ Enhanced Team Assignment
- **All Team Members**: Assignment sekarang mencakup semua anggota tim project, bukan hanya programmer
- **Inclusive Selection**: PM, Analyst, dan role lainnya di tim project bisa di-assign backlog
- **Better Flexibility**: Memungkinkan assignment yang lebih fleksibel sesuai kebutuhan project

#### 🛠 Technical Changes
- **API Update**: `GET /api/projects/[projectId]/team` mengembalikan semua anggota tim
- **UI Labels**: Updated labels dari "programmer" ke "anggota tim"
- **Validation**: Tetap memvalidasi bahwa assignee adalah anggota tim project

#### 📱 User Experience
- **Broader Options**: User melihat semua anggota tim sebagai opsi assignment
- **Role Visibility**: Jabatan ditampilkan di dropdown untuk clarity
- **Flexible Workflow**: Mendukung berbagai skenario assignment dalam tim

---

## [2.0.0] - 2024-12-03

### 🎉 Major Features Added

#### ✨ Detail Modal System
- **BacklogDetailModal**: Modal detail yang comprehensive untuk melihat informasi lengkap backlog
- **Click-to-view**: Klik pada item backlog sekarang membuka detail modal, bukan langsung edit
- **Comprehensive info**: Menampilkan semua metadata, priority indicators, dan informasi proyek/modul

#### 👥 Assignment System
- **Project-based Assignment**: Hanya menampilkan anggota tim yang ada di project terkait
- **Team-aware Selection**: Dropdown semua anggota tim berdasarkan proyekTeam (semua jabatan)
- **Assignment Status**: Visual indicator untuk item yang sudah/belum di-assign
- **Real-time Updates**: Assignment langsung terupdate tanpa refresh halaman
- **Team Validation**: Validasi bahwa hanya anggota tim project yang bisa di-assign

#### 🔄 Improved Navigation
- **Separated Actions**: 
  - Klik item → Buka detail modal
  - Button edit → Buka form edit
  - Button delete → Hapus item
  - Button view → Buka detail (di action buttons)
- **Better UX Flow**: User journey yang lebih intuitif dan jelas

### 🛠 Technical Improvements

#### 📡 New API Endpoints
- **GET /api/projects/[projectId]/team**: Endpoint untuk mengambil semua anggota tim project
- **PUT /api/backlog/[id]**: Enhanced untuk support assignment updates
- **Team-based selection**: API mengembalikan semua anggota tim tanpa filter jabatan

#### 🎨 UI/UX Enhancements
- **Priority System**: Visual indicators berdasarkan waktu update (urgent/medium/recent)
- **Assignment Indicators**: Badge dan status untuk item yang sudah di-assign
- **Action Icons**: Icon yang lebih jelas untuk setiap action (view, edit, delete)
- **Loading States**: Better loading indicators untuk assignment operations

#### 🔧 Component Architecture
- **Modular Design**: Setiap modal memiliki tanggung jawab yang jelas
- **Props Interface**: Type-safe props untuk semua komponen
- **Error Handling**: Proper error handling untuk assignment operations

### 📱 User Experience

#### 🎯 Workflow Improvements
1. **View First**: User melihat detail lengkap sebelum memutuskan action
2. **Quick Assignment**: Assignment bisa dilakukan langsung dari detail modal
3. **Context Preservation**: Modal detail tetap terbuka setelah assignment
4. **Clear Actions**: Setiap action memiliki icon dan tooltip yang jelas

#### 🚀 Performance
- **Optimized Renders**: Minimal re-renders saat assignment updates
- **Local State Updates**: Assignment updates langsung di local state
- **Efficient API Calls**: Hanya call API saat diperlukan

### 🔄 Breaking Changes

#### ⚠️ Component Props Changes
- **BacklogTableView** & **BacklogCardView**: 
  - Added `onView` prop untuk handle click-to-view
  - `onClick` behavior changed dari edit ke view
  - Edit sekarang hanya via action button

#### 📋 Migration Guide
```tsx
// Before
<BacklogTableView
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

// After  
<BacklogTableView
  onView={handleView}    // NEW: untuk click-to-view
  onEdit={handleEdit}    // Sekarang hanya via button
  onDelete={handleDelete}
/>
```

### 🐛 Bug Fixes
- Fixed modal focus management
- Improved keyboard navigation
- Better error handling untuk network failures
- Fixed responsive layout issues

### 📚 Documentation
- Updated README dengan fitur assignment
- Added component usage examples
- Documented new props dan interfaces
- Added migration guide

---

## [1.0.0] - 2024-12-02

### 🎉 Initial Release

#### ✨ Core Components
- **BacklogTableView**: Advanced table dengan priority indicators
- **BacklogCardView**: Responsive card layout dengan animations
- **BacklogFilters**: Comprehensive filtering dan search
- **BacklogPagination**: Smart pagination dengan quick jump
- **BacklogModal**: Enhanced form modal dengan validation

#### 🎨 Design System
- **Priority Colors**: Visual indicators berdasarkan waktu
- **Dark Mode**: Full dark theme support
- **Responsive**: Mobile-first design
- **Animations**: Smooth transitions dan hover effects

#### 🛠 Technical Features
- **TypeScript**: Full type safety
- **Modular Architecture**: Easy to extend dan customize
- **Performance Optimized**: Efficient rendering
- **Accessibility**: Screen reader friendly