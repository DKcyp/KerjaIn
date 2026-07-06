# CRM UAT External API Guide

Dokumentasi ini dipakai CRM untuk menjalankan flow UAT External yang terhubung ke Logbook.

## Base URL

```txt
http://localhost:3000
```

Ganti base URL sesuai domain Logbook di environment staging/production.

## Authentication

Endpoint UAT External saat ini memakai session cookie Logbook.

```http
Cookie: session=<session-token>
```

Jika CRM akan memanggil API secara server-to-server tanpa user browser session, perlu dibuat endpoint external/API-key terpisah atau adapter auth tambahan.

## Status Flow

Flow BA/blueprint untuk UAT External:

```txt
UAT_INTERNAL_SELESAI
  -> UAT_EXTERNAL
  -> UAT_EXTERNAL_SELESAI
  -> SELESAI
```

Catatan:
- `UAT_EXTERNAL` berarti UAT External sedang berjalan.
- `UAT_EXTERNAL_SELESAI` hanya boleh terjadi setelah semua task selesai dan semua task selesai tersebut sudah di-approve UAT External.
- `SELESAI` hanya boleh dikirim setelah status sudah `UAT_EXTERNAL_SELESAI`.

## 1. Mulai UAT External

Dipanggil saat user pertama kali klik tombol UAT External di CRM.

### Request

```http
PUT /api/blueprint-baru/{projectId}/ba/status
Content-Type: application/json
Cookie: session=<session-token>
```

### Body

```json
{
  "baId": 123,
  "status": "UAT_EXTERNAL"
}
```

### Prerequisite

Status BA saat ini harus:

```txt
UAT_INTERNAL_SELESAI
```

Jika status belum `UAT_INTERNAL_SELESAI`, API akan menolak transisi.

### Success Response

```json
{
  "success": true,
  "message": "Status updated to UAT_EXTERNAL"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Cannot transition from UAT_INTERNAL to UAT_EXTERNAL. Allowed: "
}
```

## 2. Ambil Daftar Task UAT External

Dipanggil saat user klik tombol proses UAT External setelah status BA sudah `UAT_EXTERNAL`. Data ini dipakai CRM untuk menampilkan modal task approval.

### Request

```http
GET /api/blueprint-baru/{projectId}/uat?baId={baId}
Cookie: session=<session-token>
```

Contoh:

```bash
curl -X GET "http://localhost:3000/api/blueprint-baru/10/uat?baId=123" \
  -H "Cookie: session=<session-token>"
```

### Success Response

```json
{
  "success": true,
  "data": {
    "ba": {
      "id": 123,
      "status": "UAT_EXTERNAL",
      "baModules": [
        {
          "id": 1,
          "nama": "Main Module",
          "level": 1,
          "parentId": null,
          "taskBAs": []
        },
        {
          "id": 2,
          "nama": "Sub Module",
          "level": 2,
          "parentId": 1,
          "taskBAs": [
            {
              "id": 456,
              "nama": "Task Name",
              "kompleksitas": "MEDIUM",
              "tasklistId": 789,
              "uatApproved": true,
              "uatExternalApproved": false,
              "uatExternalApprovedAt": null,
              "programmer": {
                "id": 20,
                "namaLengkap": "Nama Programmer"
              },
              "tasklist": {
                "id": 789,
                "kode": "01.01 - 1",
                "status": "SELESAI"
              }
            }
          ]
        }
      ]
    },
    "stats": {
      "total": 1,
      "withTasklist": 1,
      "completed": 1,
      "uatApproved": 1,
      "uatExternalApproved": 0
    }
  }
}
```

### Field Penting Untuk CRM

| Field | Keterangan |
| --- | --- |
| `taskBAs[].id` | `taskId` untuk approve UAT External |
| `taskBAs[].nama` | Nama task yang ditampilkan di modal |
| `taskBAs[].tasklist.status` | Task hanya bisa di-approve UAT External jika status `SELESAI` |
| `taskBAs[].uatExternalApproved` | Status approval UAT External |
| `taskBAs[].uatExternalApprovedAt` | Tanggal approval UAT External |

## 3. Approve Task UAT External

Dipanggil saat user approve satu task di modal UAT External.

### Request

```http
POST /api/blueprint-baru/{projectId}/uat-external
Content-Type: application/json
Cookie: session=<session-token>
```

### Body

```json
{
  "taskId": 456,
  "approved": true
}
```

### cURL

```bash
curl -X POST "http://localhost:3000/api/blueprint-baru/10/uat-external" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<session-token>" \
  -d '{
    "taskId": 456,
    "approved": true
  }'
```

### Response Jika Belum Semua Task Di-approve

```json
{
  "success": true,
  "data": {
    "id": 456,
    "nama": "Task Name",
    "uatExternalApproved": true,
    "uatExternalApprovedAt": "2026-05-15T10:30:00.000Z",
    "uatExternalApprovedBy": 7
  },
  "baStatusUpdated": false,
  "stats": {
    "totalTasks": 3,
    "completedTasks": 3,
    "uatExternalApprovedTasks": 2
  }
}
```

Status BA tetap:

```txt
UAT_EXTERNAL
```

### Response Jika Semua Task Sudah Di-approve

```json
{
  "success": true,
  "data": {
    "id": 456,
    "nama": "Task Name",
    "uatExternalApproved": true,
    "uatExternalApprovedAt": "2026-05-15T10:30:00.000Z",
    "uatExternalApprovedBy": 7
  },
  "message": "Task UAT External approved. Semua 3 task sudah di-approve UAT External, BA status otomatis diubah ke UAT_EXTERNAL_SELESAI",
  "baStatusUpdated": true,
  "stats": {
    "totalTasks": 3,
    "completedTasks": 3,
    "uatExternalApprovedTasks": 3
  }
}
```

Status BA otomatis berubah menjadi:

```txt
UAT_EXTERNAL_SELESAI
```

## 4. Unapprove Task UAT External

Jika CRM perlu membatalkan approval satu task:

### Request

```http
POST /api/blueprint-baru/{projectId}/uat-external
Content-Type: application/json
Cookie: session=<session-token>
```

### Body

```json
{
  "taskId": 456,
  "approved": false
}
```

Catatan: endpoint akan mengubah field approval task menjadi false/null. Status BA tidak otomatis diturunkan dari `UAT_EXTERNAL_SELESAI` ke `UAT_EXTERNAL`.

## 5. Selesaikan Blueprint Setelah UAT External Selesai

Dipanggil saat user klik tombol `Selesai` setelah status BA sudah `UAT_EXTERNAL_SELESAI`.

### Request

```http
PUT /api/blueprint-baru/{projectId}/ba/status
Content-Type: application/json
Cookie: session=<session-token>
```

### Body

```json
{
  "baId": 123,
  "status": "SELESAI"
}
```

### Prerequisite

Status BA saat ini harus:

```txt
UAT_EXTERNAL_SELESAI
```

### Success Response

```json
{
  "success": true,
  "message": "Status updated to SELESAI"
}
```

## Rule Auto Update ke UAT_EXTERNAL_SELESAI

BA hanya otomatis berubah ke `UAT_EXTERNAL_SELESAI` jika semua kondisi ini terpenuhi:

1. BA punya task.
2. Semua task BA sudah punya `tasklistId`.
3. Semua tasklist terkait sudah berstatus `SELESAI`.
4. Semua task yang sudah selesai sudah `uatExternalApproved = true`.

Jika masih ada 1 task belum selesai atau belum approve UAT External, status BA tetap:

```txt
UAT_EXTERNAL
```

## Suggested CRM UI Flow

1. Jika status `UAT_INTERNAL_SELESAI`, tampilkan tombol `UAT External`.
2. Klik tombol tersebut panggil `PUT /ba/status` dengan status `UAT_EXTERNAL`.
3. Jika status `UAT_EXTERNAL`, tampilkan tombol `Proses UAT External`.
4. Klik tombol tersebut panggil `GET /uat?baId=...` dan tampilkan modal task approval.
5. Di modal, hanya task dengan `tasklist.status = SELESAI` dan `uatExternalApproved = false` yang bisa di-approve.
6. Setiap approve panggil `POST /uat-external`.
7. Jika response `baStatusUpdated = true`, tutup modal atau refresh data BA.
8. Jika status sudah `UAT_EXTERNAL_SELESAI`, tampilkan tombol `Selesai`.
9. Klik `Selesai` panggil `PUT /ba/status` dengan status `SELESAI`.

## Error Codes

| HTTP Status | Penyebab |
| --- | --- |
| `400` | `taskId`, `baId`, atau `status` kosong/invalid |
| `400` | Transisi status tidak valid |
| `401` | Session cookie tidak valid/tidak ada |
| `404` | BA tidak ditemukan |
| `500` | Error server/database |

## Minimal Implementation Example

```ts
async function startUatExternal(projectId: number, baId: number) {
  return fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ baId, status: 'UAT_EXTERNAL' }),
  }).then((res) => res.json());
}

async function approveUatExternalTask(projectId: number, taskId: number) {
  return fetch(`/api/blueprint-baru/${projectId}/uat-external`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ taskId, approved: true }),
  }).then((res) => res.json());
}

async function finishAfterUatExternal(projectId: number, baId: number) {
  return fetch(`/api/blueprint-baru/${projectId}/ba/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ baId, status: 'SELESAI' }),
  }).then((res) => res.json());
}
```
