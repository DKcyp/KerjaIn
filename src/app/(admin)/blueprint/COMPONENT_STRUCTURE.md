# Blueprint Module - Component Structure

## Page 1: Project List (`/blueprint`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Manajemen Blueprint Proyek"                            │
├─────────────────────────────────────────────────────────────────┤
│ Search Bar                          │ Status Filter Dropdown    │
├─────────────────────────────────────────────────────────────────┤
│ Results Count: "Menampilkan X dari Y proyek"                   │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Project Table                                             │  │
│ │ ┌──────────┬─────────────┬──────────┬──────┬──────────┐  │  │
│ │ │Project ID│ Nama Proyek │ Client   │ PIC  │ Status   │  │  │
│ │ ├──────────┼─────────────┼──────────┼──────┼──────────┤  │  │
│ │ │PRJ-001   │ Sistem...   │ Univ...  │ Budi │ APPROVED │  │  │
│ │ │PRJ-002   │ E-Commerce  │ PT Maju  │ Siti │ DRAFT    │  │  │
│ │ │...       │ ...         │ ...      │ ...  │ ...      │  │  │
│ │ └──────────┴─────────────┴──────────┴──────┴──────────┘  │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Page 2: Project Detail (`/blueprint/[id]`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to List                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ PROJECT HEADER CARD                                             │ │
│ │ Project Name (Large, Bold)                      [STATUS BADGE]  │ │
│ │ Project ID: PRJ-XXX  │  Client: XXX  │  PIC: XXX               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ LEFT COLUMN                    │ RIGHT COLUMN                       │
│ ┌────────────────────────────┐ │ ┌────────────────────────────────┐│
│ │ DOKUMEN REQUIREMENT        │ │ │ APPROVAL & HISTORI             ││
│ │ [+ Upload Dokumen]         │ │ │ [Approve] [Reject]             ││
│ │                            │ │ │ ────────────────────────────── ││
│ │ 📄 requirements_v1.docx    │ │ │ ACTIVITY LOG                   ││
│ │    v1.0 • Budi • 2024-09   │ │ │                                ││
│ │    [👁][⬇][🔄]             │ │ │ ● Budi approved...             ││
│ │                            │ │ │   "Sudah lengkap..."           ││
│ │ 📊 database_schema.xlsx    │ │ │   2 hours ago                  ││
│ │    v1.5 • Ahmad • 2024-09  │ │ │                                ││
│ │    [👁][⬇][🔄]             │ │ │ ● Ahmad uploaded...            ││
│ └────────────────────────────┘ │ │   1 day ago                    ││
│                                │ │                                ││
│ ┌────────────────────────────┐ │ │ ● Dewi completed...            ││
│ │ CHECKLIST KEBUTUHAN SISTEM │ │ │   3 days ago                   ││
│ │                            │ │ │                                ││
│ │ Progress: 75% ▓▓▓▓▓▓▓░░░  │ │ └────────────────────────────────┘│
│ │ 2 dari 4 requirements done │ │                                   │
│ │                            │ │                                   │
│ │ ☑ Implementasi SSO         │ │                                   │
│ │   👤 Ahmad  [Done]         │ │                                   │
│ │                            │ │                                   │
│ │ ☑ Desain database          │ │                                   │
│ │   👤 Dewi   [Done]         │ │                                   │
│ │                            │ │                                   │
│ │ ☐ Integrasi payment        │ │                                   │
│ │   👤 Rudi   [Revisi]       │ │                                   │
│ │                            │ │                                   │
│ │ ☐ API documentation        │ │                                   │
│ │   👤 Linda  [Pending]      │ │                                   │
│ └────────────────────────────┘ │                                   │
└────────────────────────────────┴───────────────────────────────────┘
```

## Modals

### Upload Document Modal
```
┌─────────────────────────────────────┐
│ Upload Dokumen                  [X] │
├─────────────────────────────────────┤
│ Pilih File                          │
│ ┌─────────────────────────────────┐ │
│ │  ☁                              │ │
│ │  Klik untuk memilih file atau   │ │
│ │  drag & drop                    │ │
│ │  PDF, DOCX, XLSX (Max 10MB)     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Catatan (Opsional)                  │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Batal]              [Upload]       │
└─────────────────────────────────────┘
```

### Approval Modal
```
┌─────────────────────────────────────┐
│ Approve Blueprint               [X] │
├─────────────────────────────────────┤
│ Anda akan menyetujui blueprint ini. │
│ Silakan tambahkan catatan jika      │
│ diperlukan.                         │
│                                     │
│ Catatan/Komentar                    │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Batal]              [Approve]      │
└─────────────────────────────────────┘
```

## Status Badge Colors

- **APPROVED**: Green background, green text
- **DRAFT**: Orange background, orange text  
- **REJECTED**: Red background, red text

## Requirement Status Colors

- **Done**: Green
- **Revisi**: Orange
- **Pending**: Gray

## Interactive Elements

1. **Hover Effects**:
   - Table rows highlight on hover
   - Document cards show action buttons on hover
   - Buttons change shade on hover

2. **Click Actions**:
   - Table rows navigate to detail page
   - Upload button opens modal
   - Approve/Reject buttons open modal
   - Document action icons (preview, download, replace)

3. **Search & Filter**:
   - Real-time search across multiple fields
   - Dropdown filter for status
   - Results count updates dynamically
