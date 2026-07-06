# UAT UI Visual Preview

This document provides visual mockups of the UAT interface using ASCII art and detailed descriptions.

## 🖼️ Screen 1: UAT Queue (Table View)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Antrian UAT (User Acceptance Test)                                                     │
│  Validasi fitur yang telah selesai dikembangkan                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📋 Total     │ │ 🕐 Pending   │ │ ✅ Passed    │ │ ❌ Failed    │ │ 📊 Pass Rate │
│   Items      │ │              │ │              │ │              │ │              │
│     5        │ │      3       │ │      1       │ │      1       │ │     20%      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  🔍 Cari Fitur / Task...                                                                │
│                                                                                          │
│  Project: [Semua Project ▼]  Tester: [Semua Tester ▼]  Status: [Semua Status ▼]       │
│                                                                                          │
│  Tampilan: [📋 Table] [📊 Kanban]                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Nama Fitur / Task        │ Project              │ Developer      │ Tanggal  │ Priority │ Status  │
├──────────────────────────┼──────────────────────┼────────────────┼──────────┼──────────┼─────────┤
│ Login dengan SSO         │ Sistem Informasi     │ Ahmad Rizki    │ 09-25    │ [HIGH]   │ Pending │
│ Implementasi Single...   │ Akademik             │                │          │          │         │
├──────────────────────────┼──────────────────────┼────────────────┼──────────┼──────────┼─────────┤
│ Dashboard Analytics      │ Sistem Informasi     │ Dewi Lestari   │ 09-23    │ [MED]    │ Passed  │
│ Dashboard untuk...       │ Akademik             │                │          │          │         │
├──────────────────────────┼──────────────────────┼────────────────┼──────────┼──────────┼─────────┤
│ Payment Gateway...       │ E-Commerce Platform  │ Rudi Hartono   │ 09-20    │ [HIGH]   │ Failed  │
│ Integrasi dengan...      │                      │                │          │          │         │
├──────────────────────────┼──────────────────────┼────────────────┼──────────┼──────────┼─────────┤
│ Report Generator         │ Sistem Informasi     │ Linda Wijaya   │ 09-28    │ [MED]    │ Pending │
│ Modul untuk generate...  │ Akademik             │                │          │          │         │
├──────────────────────────┼──────────────────────┼────────────────┼──────────┼──────────┼─────────┤
│ User Management          │ E-Commerce Platform  │ Ahmad Rizki    │ 09-26    │ [HIGH]   │ Pending │
│ CRUD untuk manajemen...  │                      │                │          │          │         │
└──────────────────────────┴──────────────────────┴────────────────┴──────────┴──────────┴─────────┘
```

### Color Legend (Table View)
- **Pending Badge**: 🟠 Orange background, dark orange text
- **Passed Badge**: 🟢 Green background, dark green text
- **Failed Badge**: 🔴 Red background, dark red text
- **High Priority**: 🔴 Red solid badge
- **Medium Priority**: 🟡 Yellow solid badge
- **Low Priority**: 🔵 Blue solid badge

---

## 🖼️ Screen 1: UAT Queue (Kanban View)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Antrian UAT (User Acceptance Test)                                                     │
│  Validasi fitur yang telah selesai dikembangkan                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📋 Total     │ │ 🕐 Pending   │ │ ✅ Passed    │ │ ❌ Failed    │ │ 📊 Pass Rate │
│   Items      │ │              │ │              │ │              │ │              │
│     5        │ │      3       │ │      1       │ │      1       │ │     20%      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  🔍 Cari Fitur / Task...                                                                │
│                                                                                          │
│  Project: [Semua Project ▼]  Tester: [Semua Tester ▼]  Status: [Semua Status ▼]       │
│                                                                                          │
│  Tampilan: [📋 Table] [📊 Kanban]                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│   🟠 PENDING        (3)  │  │   🟢 PASSED         (1)  │  │   🔴 FAILED         (1)  │
├──────────────────────────┤  ├──────────────────────────┤  ├──────────────────────────┤
│                          │  │                          │  │                          │
│ ┌────────────────────┐   │  │ ┌────────────────────┐   │  │ ┌────────────────────┐   │
│ │ Login dengan SSO   │   │  │ │ Dashboard          │   │  │ │ Payment Gateway    │   │
│ │ [HIGH]             │   │  │ │ Analytics [MED]    │   │  │ │ Integration [HIGH] │   │
│ │                    │   │  │ │                    │   │  │ │                    │   │
│ │ Implementasi SSO   │   │  │ │ Dashboard untuk    │   │  │ │ Integrasi dengan   │   │
│ │ untuk autentikasi  │   │  │ │ menampilkan...     │   │  │ │ payment gateway... │   │
│ │                    │   │  │ │                    │   │  │ │                    │   │
│ │ Sistem Informasi   │   │  │ │ Sistem Informasi   │   │  │ │ E-Commerce         │   │
│ │ Ahmad Rizki        │   │  │ │ Dewi Lestari       │   │  │ │ Rudi Hartono       │   │
│ │                    │   │  │ │                    │   │  │ │                    │   │
│ │ Selesai: 09-25     │   │  │ │ Tested by: QA Team │   │  │ │ Tested by: QA Team │   │
│ └────────────────────┘   │  │ └────────────────────┘   │  │ └────────────────────┘   │
│                          │  │                          │  │                          │
│ ┌────────────────────┐   │  │                          │  │                          │
│ │ Report Generator   │   │  │                          │  │                          │
│ │ [MED]              │   │  │                          │  │                          │
│ │                    │   │  │                          │  │                          │
│ │ Modul untuk        │   │  │                          │  │                          │
│ │ generate laporan   │   │  │                          │  │                          │
│ │                    │   │  │                          │  │                          │
│ │ Sistem Informasi   │   │  │                          │  │                          │
│ │ Linda Wijaya       │   │  │                          │  │                          │
│ │                    │   │  │                          │  │                          │
│ │ Selesai: 09-28     │   │  │                          │  │                          │
│ └────────────────────┘   │  │                          │  │                          │
│                          │  │                          │  │                          │
│ ┌────────────────────┐   │  │                          │  │                          │
│ │ User Management    │   │  │                          │  │                          │
│ │ [HIGH]             │   │  │                          │  │                          │
│ │                    │   │  │                          │  │                          │
│ │ CRUD untuk         │   │  │                          │  │                          │
│ │ manajemen user...  │   │  │                          │  │                          │
│ │                    │   │  │                          │  │                          │
│ │ E-Commerce         │   │  │                          │  │                          │
│ │ Ahmad Rizki        │   │  │                          │  │                          │
│ │                    │   │  │                          │  │                          │
│ │ Selesai: 09-26     │   │  │                          │  │                          │
│ └────────────────────┘   │  │                          │  │                          │
│                          │  │                          │  │                          │
└──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

---

## 🖼️ Screen 2: UAT Detail & Execution

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  ← Kembali ke Daftar UAT                                                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Login dengan SSO                                                    [🟠 Pending]       │
│  Sistem Informasi Akademik • Developer: Ahmad Rizki • Selesai: 2024-09-25              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  LEFT COLUMN (Information)                  │  │  RIGHT COLUMN (Actions)              │
│                                             │  │                                      │
│  ┌─────────────────────────────────────┐   │  │  ┌──────────────────────────────┐   │
│  │ 📝 Deskripsi Fitur                  │   │  │  │ Status Saat Ini              │   │
│  ├─────────────────────────────────────┤   │  │  ├──────────────────────────────┤   │
│  │                                     │   │  │  │                              │   │
│  │ Implementasi Single Sign-On untuk  │   │  │  │      [🟠 Pending]            │   │
│  │ autentikasi pengguna menggunakan   │   │  │  │                              │   │
│  │ protokol OAuth 2.0. Fitur ini      │   │  │  └──────────────────────────────┘   │
│  │ memungkinkan pengguna untuk login  │   │  │                                      │
│  │ menggunakan kredensial kampus...   │   │  │  ┌──────────────────────────────┐   │
│  │                                     │   │  │  │ Aksi Testing                 │   │
│  └─────────────────────────────────────┘   │  │  ├──────────────────────────────┤   │
│                                             │  │  │                              │   │
│  ┌─────────────────────────────────────┐   │  │  │  ┌────────────────────────┐ │   │
│  │ ✅ Requirements & Acceptance        │   │  │  │  │  ✔ Lulus (Pass)        │ │   │
│  │    Criteria                         │   │  │  │  │  [Green Button]        │ │   │
│  ├─────────────────────────────────────┤   │  │  │  └────────────────────────┘ │   │
│  │                                     │   │  │  │                              │   │
│  │ 1. User harus bisa login dengan    │   │  │  │  ┌────────────────────────┐ │   │
│  │    kredensial SSO kampus           │   │  │  │  │  ✖ Gagal (Fail)        │ │   │
│  │ 2. Sistem harus redirect ke        │   │  │  │  │  [Red Button]          │ │   │
│  │    halaman SSO provider            │   │  │  │  └────────────────────────┘ │   │
│  │ 3. Setelah autentikasi berhasil,   │   │  │  │                              │   │
│  │    user diarahkan kembali...       │   │  │  └──────────────────────────────┘   │
│  │ 4. Session user harus tersimpan    │   │  │                                      │
│  │    dengan aman                     │   │  │  ┌──────────────────────────────┐   │
│  │ 5. Logout harus menghapus session  │   │  │  │ Activity Log                 │   │
│  │                                     │   │  │  ├──────────────────────────────┤   │
│  └─────────────────────────────────────┘   │  │  │                              │   │
│                                             │  │  │  ●─┐ AR                      │   │
│  ┌─────────────────────────────────────┐   │  │  │  │ Ahmad Rizki menyelesaikan│   │
│  │ 🔗 Link Terkait                     │   │  │  │  │ development fitur ini    │   │
│  ├─────────────────────────────────────┤   │  │  │  │ [🟠 Pending]             │   │
│  │                                     │   │  │  │  │ 2024-09-25 16:45         │   │
│  │ 🔗 https://dev.example.com/sso-login│   │  │  │  │                          │   │
│  │                                     │   │  │  │  ●─┐ AR                      │   │
│  └─────────────────────────────────────┘   │  │  │    │ Ahmad Rizki mengunggah  │   │
│                                             │  │  │    │ dokumentasi teknis      │   │
│  ┌─────────────────────────────────────┐   │  │  │    │ 2024-09-25 10:35        │   │
│  │ 📎 Lampiran                         │   │  │  │    │                         │   │
│  ├─────────────────────────────────────┤   │  │  └────┴─────────────────────────┘   │
│  │                                     │   │  │                                      │
│  │ ┌─────────────────────────────────┐ │   │  └──────────────────────────────────────┘
│  │ │ 🖼️ sso_flow_diagram.png        │ │   │
│  │ │ Ahmad Rizki • 2024-09-25 10:30 │ │   │
│  │ │                            [⬇] │ │   │
│  │ └─────────────────────────────────┘ │   │
│  │                                     │   │
│  │ ┌─────────────────────────────────┐ │   │
│  │ │ 📄 technical_spec.pdf           │ │   │
│  │ │ Ahmad Rizki • 2024-09-25 10:35 │ │   │
│  │ │                            [⬇] │ │   │
│  │ └─────────────────────────────────┘ │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎭 Feedback Modal: Pass

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │                                                      │     │
│  │   ┌───┐                                              │     │
│  │   │ ✓ │  Konfirmasi Lulus (Pass)                    │     │
│  │   └───┘  Fitur ini telah memenuhi semua requirements│     │
│  │                                                      │     │
│  │   ─────────────────────────────────────────────────  │     │
│  │                                                      │     │
│  │   Catatan (opsional)                                │     │
│  │   ┌────────────────────────────────────────────┐    │     │
│  │   │ Tambahkan catatan...                       │    │     │
│  │   │                                            │    │     │
│  │   │                                            │    │     │
│  │   │                                            │    │     │
│  │   │                                            │    │     │
│  │   └────────────────────────────────────────────┘    │     │
│  │                                                      │     │
│  │   ─────────────────────────────────────────────────  │     │
│  │                                                      │     │
│  │   [      Batal      ]  [  Kirim Feedback  ]         │     │
│  │   [  Gray Button   ]  [ Green Button     ]          │     │
│  │                                                      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎭 Feedback Modal: Fail

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │                                                      │     │
│  │   ┌───┐                                              │     │
│  │   │ ✖ │  Laporan Kegagalan (Fail)                   │     │
│  │   └───┘  Berikan detail masalah yang ditemukan      │     │
│  │                                                      │     │
│  │   ─────────────────────────────────────────────────  │     │
│  │                                                      │     │
│  │   Catatan *                                          │     │
│  │   ┌────────────────────────────────────────────┐    │     │
│  │   │ Jelaskan masalah yang ditemukan,           │    │     │
│  │   │ langkah untuk reproduce, dan expected      │    │     │
│  │   │ vs actual behavior...                      │    │     │
│  │   │                                            │    │     │
│  │   │                                            │    │     │
│  │   └────────────────────────────────────────────┘    │     │
│  │                                                      │     │
│  │   Lampirkan Screenshot / Video                      │     │
│  │   ┌────────────────────────────────────────────┐    │     │
│  │   │          ☁️                                 │    │     │
│  │   │    Click to upload or drag and drop       │    │     │
│  │   │    PNG, JPG, GIF, MP4 up to 10MB          │    │     │
│  │   └────────────────────────────────────────────┘    │     │
│  │                                                      │     │
│  │   📎 error_screenshot.png                    [✖]    │     │
│  │   📎 video_recording.mp4                     [✖]    │     │
│  │                                                      │     │
│  │   ─────────────────────────────────────────────────  │     │
│  │                                                      │     │
│  │   [      Batal      ]  [  Kirim Feedback  ]         │     │
│  │   [  Gray Button   ]  [  Red Button      ]          │     │
│  │                      [  Disabled if no comment ]     │     │
│  │                                                      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Palette Reference

### Status Colors

#### Pending (Orange/Yellow)
- **Background**: `bg-orange-50 dark:bg-orange-900/20`
- **Text**: `text-orange-900 dark:text-orange-300`
- **Border**: `border-orange-200 dark:border-orange-800`
- **Badge**: `bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400`

#### Passed (Green)
- **Background**: `bg-green-50 dark:bg-green-900/20`
- **Text**: `text-green-900 dark:text-green-300`
- **Border**: `border-green-200 dark:border-green-800`
- **Badge**: `bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400`

#### Failed (Red)
- **Background**: `bg-red-50 dark:bg-red-900/20`
- **Text**: `text-red-900 dark:text-red-300`
- **Border**: `border-red-200 dark:border-red-800`
- **Badge**: `bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400`

#### Primary (Blue/Teal)
- **Background**: `bg-blue-50 dark:bg-blue-900/20`
- **Text**: `text-blue-900 dark:text-blue-300`
- **Border**: `border-blue-200 dark:border-blue-800`
- **Button**: `bg-blue-600 hover:bg-blue-700 text-white`

### Priority Colors

#### High Priority
- **Badge**: `bg-red-600 text-white`

#### Medium Priority
- **Badge**: `bg-yellow-600 text-white`

#### Low Priority
- **Badge**: `bg-blue-600 text-white`

### Neutral Colors

#### Background
- **Light**: `bg-white`
- **Dark**: `bg-gray-800`

#### Border
- **Light**: `border-gray-200`
- **Dark**: `border-gray-700`

#### Text
- **Primary Light**: `text-gray-900`
- **Primary Dark**: `text-gray-100`
- **Secondary Light**: `text-gray-600`
- **Secondary Dark**: `text-gray-400`

---

## 📐 Component Dimensions

### Statistics Cards
- **Width**: Equal columns (1/5 of container)
- **Height**: Auto (min 120px)
- **Padding**: 20px (p-5)
- **Border Radius**: 8px (rounded-lg)

### Filter Section
- **Height**: Auto
- **Padding**: 24px (p-6)
- **Gap**: 16px (gap-4)

### Table
- **Row Height**: Auto (min 60px)
- **Cell Padding**: 24px horizontal, 16px vertical (px-6 py-4)
- **Header Height**: 48px

### Kanban Cards
- **Width**: 100% of column
- **Min Height**: 180px
- **Padding**: 16px (p-4)
- **Gap**: 12px (gap-3)

### Detail Page Layout
- **Left Column**: 66.67% (2/3)
- **Right Column**: 33.33% (1/3)
- **Gap**: 24px (gap-6)

### Buttons
- **Height**: 48px (py-3)
- **Padding**: 24px horizontal (px-6)
- **Border Radius**: 8px (rounded-lg)
- **Font Weight**: 500 (font-medium)

### Modal
- **Max Width**: 672px (max-w-2xl)
- **Padding**: 24px (p-6)
- **Border Radius**: 24px (rounded-3xl)
- **Backdrop**: Blur 32px

---

## 🎬 Interaction States

### Hover States
- **Table Row**: `hover:bg-gray-50 dark:hover:bg-gray-700/50`
- **Kanban Card**: `hover:shadow-md`
- **Button**: Darker shade of base color
- **Link**: `hover:underline`

### Active States
- **Selected Filter**: Blue border and background
- **Active Tab**: Blue border bottom

### Focus States
- **Input**: `focus:ring-2 focus:ring-blue-500`
- **Button**: `focus:outline-none focus:ring-2`

### Disabled States
- **Button**: `disabled:opacity-50 disabled:cursor-not-allowed`
- **Input**: `disabled:bg-gray-100 disabled:cursor-not-allowed`

---

## 📱 Responsive Breakpoints

### Desktop (≥1024px)
- Full two-column layout
- All features visible
- Optimal viewing experience

### Tablet (768px - 1023px)
- Stacked columns on detail page
- Scrollable table
- Compact filters

### Mobile (<768px)
- Single column layout
- Simplified table (fewer columns)
- Stacked statistics cards
- Full-width buttons

---

**Note**: These are visual mockups. The actual implementation uses React components with Tailwind CSS for styling and full interactivity.
