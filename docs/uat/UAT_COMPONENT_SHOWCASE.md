# UAT Component Showcase

This document showcases all the UI components used in the UAT interface with code examples and visual descriptions.

## 📊 Statistics Cards

### Visual Appearance
```
┌──────────────────────────┐
│ 📋 Total Items           │
│                          │
│        5                 │
│                          │
└──────────────────────────┘
```

### Code Example
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
        Total Items
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
        5
      </p>
    </div>
    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </div>
  </div>
</div>
```

### Variants
- **Total Items**: Blue icon, neutral text
- **Pending**: Orange icon, orange text
- **Passed**: Green icon, green text
- **Failed**: Red icon, red text
- **Pass Rate**: Purple icon, blue text

---

## 🏷️ Status Badges

### Visual Appearance
```
[🟠 Pending]  [🟢 Passed]  [🔴 Failed]
```

### Code Example
```tsx
import Badge from "@/components/ui/badge/Badge";

// Pending
<Badge variant="light" color="warning" size="sm">
  Pending
</Badge>

// Passed
<Badge variant="light" color="success" size="sm">
  Passed
</Badge>

// Failed
<Badge variant="light" color="error" size="sm">
  Failed
</Badge>
```

### Props
- `variant`: "light" | "solid"
- `color`: "warning" | "success" | "error" | "primary" | "info"
- `size`: "sm" | "md"

---

## 🎯 Priority Badges

### Visual Appearance
```
[HIGH]  [MEDIUM]  [LOW]
 Red     Yellow    Blue
```

### Code Example
```tsx
// High Priority
<Badge variant="solid" color="error" size="sm">
  High
</Badge>

// Medium Priority
<Badge variant="solid" color="warning" size="sm">
  Medium
</Badge>

// Low Priority
<Badge variant="solid" color="info" size="sm">
  Low
</Badge>
```

---

## 🔍 Search Input

### Visual Appearance
```
┌────────────────────────────────────────────┐
│ 🔍 Cari berdasarkan nama fitur, project... │
└────────────────────────────────────────────┘
```

### Code Example
```tsx
<input
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Cari berdasarkan nama fitur, project, atau developer..."
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

---

## 📋 Select Dropdown

### Visual Appearance
```
┌────────────────────┐
│ Semua Project    ▼ │
└────────────────────┘
```

### Code Example
```tsx
import Select2Field from "@/components/form/Select2Field";

<Select2Field
  value={selectedProjectId === "" ? "" : selectedProjectId}
  onChange={(v) => setSelectedProjectId(v === "" ? "" : Number(v))}
  options={[
    { id: "", text: "Semua Project" },
    ...projects.map((p) => ({ id: p.id, text: `${p.kodeProyek} - ${p.namaProyek}` })),
  ]}
  placeholder="Semua Project"
  className="rounded-lg"
/>
```

---

## 🔄 View Mode Toggle

### Visual Appearance
```
┌──────────────────┐
│ [📋] [📊]        │
│ Table  Kanban    │
└──────────────────┘
```

### Code Example
```tsx
<div className="flex gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-gray-50 dark:bg-gray-900">
  <button
    onClick={() => setViewMode("table")}
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      viewMode === "table"
        ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
    }`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  </button>
  <button
    onClick={() => setViewMode("kanban")}
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      viewMode === "kanban"
        ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
    }`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  </button>
</div>
```

---

## 📊 Data Table

### Visual Appearance
```
┌────────────────┬──────────┬───────────┬─────────┬──────────┬─────────┐
│ Nama Fitur     │ Project  │ Developer │ Tanggal │ Priority │ Status  │
├────────────────┼──────────┼───────────┼─────────┼──────────┼─────────┤
│ Login SSO      │ SIA      │ Ahmad     │ 09-25   │ [HIGH]   │ Pending │
│ Dashboard      │ SIA      │ Dewi      │ 09-23   │ [MED]    │ Passed  │
└────────────────┴──────────┴───────────┴─────────┴──────────┴─────────┘
```

### Code Example
```tsx
<table className="w-full text-sm">
  <thead className="bg-gray-50 dark:bg-gray-900/50">
    <tr>
      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Nama Fitur / Task
      </th>
      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Project
      </th>
      {/* More columns... */}
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
    {filteredItems.map((item) => (
      <tr
        key={item.id}
        onClick={() => handleItemClick(item.id)}
        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
      >
        <td className="px-6 py-4">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {item.namaFitur}
          </div>
        </td>
        {/* More cells... */}
      </tr>
    ))}
  </tbody>
</table>
```

---

## 📌 Kanban Card

### Visual Appearance
```
┌────────────────────────┐
│ Login dengan SSO       │
│ [HIGH]                 │
│                        │
│ Implementasi SSO untuk │
│ autentikasi pengguna   │
│                        │
│ Sistem Informasi       │
│ Ahmad Rizki            │
│                        │
│ Selesai: 09-25         │
└────────────────────────┘
```

### Code Example
```tsx
<div
  onClick={() => handleItemClick(item.id)}
  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
>
  <div className="flex items-start justify-between gap-2 mb-2">
    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
      {item.namaFitur}
    </h4>
    {getPriorityBadge(item.priority)}
  </div>
  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
    {item.deskripsi}
  </p>
  <div className="flex items-center justify-between text-xs">
    <span className="text-gray-500 dark:text-gray-400">{item.projectName}</span>
    <span className="text-gray-700 dark:text-gray-300 font-medium">{item.developerName}</span>
  </div>
  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
    <span className="text-xs text-gray-500 dark:text-gray-400">
      Selesai: {item.tanggalSelesaiDev}
    </span>
  </div>
</div>
```

---

## 🎬 Action Buttons

### Visual Appearance
```
┌────────────────────────┐
│  ✔ Lulus (Pass)        │
│  [Green Button]        │
└────────────────────────┘

┌────────────────────────┐
│  ✖ Gagal (Fail)        │
│  [Red Button]          │
└────────────────────────┘
```

### Code Example
```tsx
// Pass Button
<button
  onClick={handlePassClick}
  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  ✔ Lulus (Pass)
</button>

// Fail Button
<button
  onClick={handleFailClick}
  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  ✖ Gagal (Fail)
</button>
```

---

## 📎 File Attachment Display

### Visual Appearance
```
┌─────────────────────────────────────┐
│ 🖼️ sso_flow_diagram.png            │
│ Ahmad Rizki • 2024-09-25 10:30  [⬇] │
└─────────────────────────────────────┘
```

### Code Example
```tsx
<div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
  {getFileIcon(attachment.fileType)}
  <div className="flex-1 min-w-0">
    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
      {attachment.fileName}
    </p>
    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>{attachment.uploadedBy}</span>
      <span>•</span>
      <span>{attachment.uploadedAt}</span>
    </div>
  </div>
  <button className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  </button>
</div>
```

---

## 📅 Activity Timeline

### Visual Appearance
```
●─┐ AR
  │ Ahmad Rizki menyelesaikan
  │ development fitur ini
  │ [🟠 Pending]
  │ 2024-09-25 16:45
  │
●─┐ AR
    │ Ahmad Rizki mengunggah
    │ dokumentasi teknis
    │ 2024-09-25 10:35
```

### Code Example
```tsx
<div className="space-y-4">
  {activityLog.map((log, index) => (
    <div key={log.id} className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {log.user.split(" ").map((n) => n[0]).join("")}
          </span>
        </div>
        {index < activityLog.length - 1 && (
          <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
        )}
      </div>
      <div className="flex-1 pb-4">
        <p className="text-sm text-gray-900 dark:text-gray-100">
          <span className="font-semibold">{log.user}</span> {log.action}
        </p>
        {log.status && (
          <div className="mt-2">
            {getStatusBadge(log.status)}
          </div>
        )}
        {log.comment && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{log.comment}"</p>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.timestamp}</p>
      </div>
    </div>
  ))}
</div>
```

---

## 🎭 Modal Component

### Visual Appearance
```
┌─────────────────────────────────────┐
│                                     │
│  ┌───────────────────────────────┐  │
│  │                           [X] │  │
│  │   Modal Title                 │  │
│  │                               │  │
│  │   Modal Content...            │  │
│  │                               │  │
│  │   [Cancel]  [Submit]          │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Code Example
```tsx
import { Modal } from "@/components/ui/modal/index";
import { useModal } from "@/hooks/useModal";

const { isOpen, openModal, closeModal } = useModal();

<Modal isOpen={isOpen} onClose={closeModal} className="max-w-2xl p-6">
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
      Modal Title
    </h3>
    
    {/* Modal Content */}
    
    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={closeModal}
        className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        Submit
      </button>
    </div>
  </div>
</Modal>
```

---

## 📤 File Upload Zone

### Visual Appearance
```
┌─────────────────────────────────────┐
│            ☁️                        │
│    Click to upload or drag and drop │
│    PNG, JPG, GIF, MP4 up to 10MB    │
└─────────────────────────────────────┘
```

### Code Example
```tsx
<div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
  <input
    type="file"
    multiple
    accept="image/*,video/*"
    onChange={handleFileChange}
    className="hidden"
    id="feedback-file-upload"
  />
  <label htmlFor="feedback-file-upload" className="cursor-pointer">
    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      <span className="text-blue-600 dark:text-blue-400 font-medium">Click to upload</span> or drag and drop
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
      PNG, JPG, GIF, MP4 up to 10MB
    </p>
  </label>
</div>
```

---

## 🎉 Empty State

### Visual Appearance
```
┌─────────────────────────────────────┐
│                                     │
│              🎉                     │
│                                     │
│   Kerja bagus! Semua item sudah     │
│   diuji.                            │
│                                     │
│   Tidak ada item UAT yang perlu     │
│   divalidasi saat ini.              │
│                                     │
└─────────────────────────────────────┘
```

### Code Example
```tsx
<div className="flex flex-col items-center justify-center space-y-3 py-12">
  <div className="text-6xl">🎉</div>
  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
    Kerja bagus! Semua item sudah diuji.
  </h3>
  <p className="text-sm text-gray-600 dark:text-gray-400">
    Tidak ada item UAT yang perlu divalidasi saat ini.
  </p>
</div>
```

---

## 🎨 Component Styling Patterns

### Card Container
```tsx
className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
```

### Section Title
```tsx
className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
```

### Body Text
```tsx
className="text-sm text-gray-700 dark:text-gray-300"
```

### Hover Effect
```tsx
className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
```

### Focus Ring
```tsx
className="focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

---

## 🎯 Usage Tips

### Consistent Spacing
- Use `gap-4` for section spacing
- Use `gap-2` or `gap-3` for element spacing
- Use `p-6` for card padding
- Use `px-6 py-4` for table cells

### Color Consistency
- Use semantic colors (success, error, warning)
- Maintain dark mode variants
- Use opacity for hover states

### Typography Scale
- Page Title: `text-3xl font-bold`
- Section Title: `text-lg font-semibold`
- Body: `text-sm`
- Caption: `text-xs`

### Responsive Design
- Use `flex-wrap` for filter rows
- Use `overflow-x-auto` for tables
- Use `grid` with responsive columns

---

**All components are production-ready and follow the existing design system!**
