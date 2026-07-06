# Backlog Components

Kumpulan komponen React untuk mengelola backlog dengan UI/UX yang modern dan responsif.

## Komponen Utama

### 1. BacklogTableView
Komponen untuk menampilkan backlog dalam format tabel dengan fitur:
- **Priority indicators** berdasarkan waktu update terakhir
- **Hover effects** yang smooth
- **Responsive design** dengan horizontal scroll pada mobile
- **Action buttons** yang muncul saat hover
- **Status indicators** dengan warna yang berbeda

```tsx
<BacklogTableView
  notes={notes}
  projects={projects}
  moduleLabelCache={moduleLabelCache}
  loading={loading}
  page={page}
  pageSize={pageSize}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### 2. BacklogCardView
Komponen untuk menampilkan backlog dalam format kartu dengan fitur:
- **Card layout** yang responsif (1-4 kolom tergantung screen size)
- **Priority borders** dengan warna indikator
- **Hover animations** dengan scale effect
- **Relative time display** (baru saja, 1 jam lalu, dll)
- **Loading skeleton** yang smooth

```tsx
<BacklogCardView
  notes={notes}
  projects={projects}
  moduleLabelCache={moduleLabelCache}
  loading={loading}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### 3. BacklogFilters
Komponen untuk filter dan toolbar dengan fitur:
- **Project filter** dengan Select2 dropdown
- **Search input** dengan clear button
- **View mode toggle** (table/card) dengan icons
- **Page size selector**
- **Reset filter** functionality
- **Info banner** dengan tips penggunaan

```tsx
<BacklogFilters
  projects={projects}
  filterProjectId={filterProjectId}
  setFilterProjectId={setFilterProjectId}
  q={searchQuery}
  setQ={setSearchQuery}
  viewMode={viewMode}
  setViewMode={setViewMode}
  pageSize={pageSize}
  setPageSize={setPageSize}
  total={totalItems}
  onReset={handleReset}
  onAddNew={handleAddNew}
/>
```

### 4. BacklogPagination
Komponen pagination yang advanced dengan fitur:
- **Smart page numbers** dengan ellipsis
- **Quick jump** untuk dataset besar (>10 halaman)
- **Results info** (showing X to Y of Z results)
- **Responsive design** (mobile-friendly)
- **Keyboard navigation** support

```tsx
<BacklogPagination
  page={currentPage}
  pageSize={itemsPerPage}
  total={totalItems}
  onPageChange={handlePageChange}
  loading={isLoading}
/>
```

### 5. BacklogModal
Modal form yang enhanced dengan fitur:
- **Auto-focus** pada field pertama
- **Keyboard shortcuts** (Ctrl+Enter untuk save, Escape untuk close)
- **Real-time validation** dengan error indicators
- **Character counter** untuk textarea
- **Tips dan guidelines** untuk user
- **Loading states** yang jelas

### 6. BacklogDetailModal
Modal detail yang comprehensive dengan fitur:
- **Full item details** dengan metadata lengkap
- **Assignment functionality** untuk assign ke anggota tim project
- **Priority indicators** dengan visual yang jelas
- **Action buttons** (edit, delete, assign)
- **Team member selection** dengan dropdown semua anggota tim project
- **Real-time assignment updates**

```tsx
<BacklogModal
  isOpen={modalOpen}
  onClose={handleClose}
  editId={editingId}
  formTitle={title}
  setFormTitle={setTitle}
  formNote={note}
  setFormNote={setNote}
  formProjectId={projectId}
  setFormProjectId={setProjectId}
  formModuleId={moduleId}
  setFormModuleId={setModuleId}
  projects={projects}
  moduleLabelCache={moduleCache}
  errors={validationErrors}
  saving={isSaving}
  isValid={formIsValid}
  onSave={handleSave}
/>
```

```tsx
<BacklogDetailModal
  isOpen={detailOpen}
  onClose={handleDetailClose}
  note={selectedNote}
  projects={projects}
  moduleLabelCache={moduleCache}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onAssign={handleAssign}
/>
```

## Fitur UI/UX yang Ditingkatkan

### 🎨 Visual Improvements
- **Priority color coding**: Merah (>7 hari), Kuning (3-7 hari), Hijau (<3 hari)
- **Smooth animations**: Hover effects, transitions, loading states
- **Modern shadows**: Subtle depth dengan box-shadow
- **Consistent spacing**: Grid system yang rapi
- **Dark mode support**: Semua komponen mendukung dark theme

### 📱 Responsive Design
- **Mobile-first approach**: Optimized untuk semua screen size
- **Adaptive grid**: 1-4 kolom tergantung lebar layar
- **Touch-friendly**: Button size dan spacing yang sesuai mobile
- **Horizontal scroll**: Table tetap usable di mobile

### ⚡ Performance Features
- **Loading skeletons**: Placeholder yang smooth saat loading
- **Optimized re-renders**: Menggunakan useMemo dan useCallback
- **Lazy loading ready**: Struktur yang mendukung infinite scroll
- **Efficient updates**: Minimal DOM manipulation

### 🔧 Developer Experience
- **TypeScript support**: Full type safety
- **Modular components**: Easy to customize dan extend
- **Consistent API**: Props interface yang predictable
- **Error boundaries ready**: Graceful error handling

### 🎯 User Experience
- **Keyboard navigation**: Full keyboard support
- **Screen reader friendly**: Proper ARIA labels
- **Loading states**: Clear feedback untuk user actions
- **Error handling**: User-friendly error messages
- **Contextual help**: Tips dan guidelines yang helpful
- **Assignment workflow**: Seamless team member assignment
- **Detail view**: Comprehensive item information
- **Action separation**: Clear distinction antara view, edit, dan delete

## Struktur File

```
src/components/backlog/
├── BacklogTableView.tsx     # Komponen tabel
├── BacklogCardView.tsx      # Komponen kartu
├── BacklogFilters.tsx       # Filter dan toolbar
├── BacklogPagination.tsx    # Pagination
├── BacklogModal.tsx         # Modal form (create/edit)
├── BacklogDetailModal.tsx   # Modal detail & assignment
├── backlog.css             # Custom styles
├── index.ts                # Export barrel
└── README.md               # Dokumentasi ini
```

## Penggunaan

Import semua komponen dari index:

```tsx
import {
  BacklogTableView,
  BacklogCardView,
  BacklogFilters,
  BacklogPagination,
  BacklogModal,
  BacklogDetailModal
} from '@/components/backlog';
```

Atau import individual:

```tsx
import BacklogTableView from '@/components/backlog/BacklogTableView';
```

## Customization

Semua komponen menggunakan Tailwind CSS classes yang bisa di-override. Untuk customization lebih lanjut, edit file `backlog.css` atau tambahkan custom classes.

## Best Practices

1. **Gunakan loading states** untuk feedback yang baik
2. **Implement error boundaries** untuk error handling
3. **Optimize data fetching** dengan proper caching
4. **Test responsiveness** di berbagai device
5. **Maintain accessibility** dengan proper ARIA labels