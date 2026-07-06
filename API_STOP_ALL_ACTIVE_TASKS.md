# API: Stop All Active Tasks (Auto-Stop Cron Job)

API untuk menghentikan semua tasklist yang sedang berjalan dan mengirim notifikasi WhatsApp ke programmer.

**PUBLIC ENDPOINT - Tidak perlu authentication!**

## Endpoints

### 1. Health Check (GET)
```
GET /api/tasklist/stop-all-active
```

Endpoint untuk monitoring dan health check cron job.

**Response:**
```json
{
  "status": "ok",
  "service": "stop-all-active-tasks",
  "timestamp": "2024-03-30T10:30:00.000Z",
  "activeTasksCount": 3,
  "message": "Service is running. Use POST method to stop all active tasks."
}
```

### 2. Stop All Tasks (POST)
```
POST /api/tasklist/stop-all-active
```

## Authorization

**TIDAK PERLU AUTHENTICATION!**

Endpoint ini adalah public endpoint yang bisa langsung dipanggil oleh cron job tanpa perlu API key atau session.

## Request

### Headers
```
Content-Type: application/json
```

### Body (Optional)
```json
{
  "reason": "Alasan menghentikan semua task (optional)",
  "sendAdminNotification": true
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Alasan menghentikan semua task. Akan ditampilkan di log dan notifikasi WhatsApp |
| sendAdminNotification | boolean | No | Kirim summary ke admin (default: true) |

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Successfully stopped 3 out of 3 active tasks",
  "stoppedCount": 3,
  "failedCount": 0,
  "whatsappSuccessCount": 2,
  "whatsappFailedCount": 1,
  "reason": "Akhir jam kerja (16:00 WIB)",
  "initiatedBy": "Cron Job (Automated)",
  "isCronJob": true,
  "timestamp": "2024-03-30T16:00:00.000Z",
  "tasks": [
    {
      "taskId": 446,
      "taskCode": "PROJ-001",
      "programmerId": 123,
      "programmerName": "John Doe",
      "projectName": "Website E-Commerce",
      "moduleName": "Login Module",
      "sessionDuration": 45,
      "totalDuration": 120,
      "stopped": true,
      "whatsappSent": true,
      "whatsappError": null
    }
  ]
}
```

### No Active Tasks (200 OK)

```json
{
  "success": true,
  "message": "No active tasks to stop",
  "stoppedCount": 0,
  "tasks": []
}
```

### Error Response

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details here"
}
```

## Setup Cron Job

### URL untuk Cron Job

**Production:**
```
https://log.expressa.id/api/tasklist/stop-all-active
```

**Development:**
```
http://localhost:3000/api/tasklist/stop-all-active
```

### Configure Cron Service

#### Option A: External Cron Service (cron-job.org, EasyCron, dll)

**URL:** `https://log.expressa.id/api/tasklist/stop-all-active`

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "reason": "Akhir jam kerja (16:00 WIB). Selamat beristirahat!",
  "sendAdminNotification": true
}
```

**Schedule:** `0 16 * * *` (Setiap hari jam 4 sore)

**Timezone:** Asia/Jakarta (WIB)

#### Option B: n8n Workflow

1. Buat workflow baru di n8n
2. Tambahkan **Schedule Trigger**:
   - Mode: Every Day
   - Hour: 16
   - Minute: 0
   - Timezone: Asia/Jakarta

3. Tambahkan **HTTP Request Node**:
   - Method: POST
   - URL: `https://log.expressa.id/api/tasklist/stop-all-active`
   - Headers:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - Body:
     ```json
     {
       "reason": "Akhir jam kerja (16:00 WIB). Selamat beristirahat!",
       "sendAdminNotification": true
     }
     ```

4. Save & Activate Workflow

#### Option C: Server Cron (Linux)

Edit crontab:
```bash
crontab -e
```

Tambahkan:
```bash
# Stop all active tasks at 4 PM every day
0 16 * * * curl -X POST https://log.expressa.id/api/tasklist/stop-all-active \
  -H "Content-Type: application/json" \
  -d '{"reason":"Akhir jam kerja (16:00 WIB)","sendAdminNotification":true}' \
  >> /var/log/auto-stop-tasks.log 2>&1
```

## Behavior

### Apa yang Dilakukan API Ini?

1. **Ambil Semua Task Aktif**
   - Query task dengan status `SEDANG_DIPROSES_USER`
   - Filter yang `isPaused = false`
   - Filter yang `startedAt` tidak null

2. **Stop Setiap Task**
   - Hitung durasi sesi saat ini
   - Update status ke `SEDANG_DIPROSES_USER_PAUSED`
   - Set `pausedAt` ke waktu sekarang
   - Update `totalDurationMinutes`
   - Set `isPaused = true`

3. **Log Aktivitas**
   - Catat ke `tasklist_log` dengan action `STOP_ALL`
   - Simpan alasan (jika ada)
   - Simpan "Cron Job (Automated)" sebagai initiator

4. **Kirim Notifikasi WhatsApp ke Programmer**
   - Kirim ke setiap programmer yang tasknya dihentikan
   - Format pesan dengan greeting sesuai waktu
   - Include alasan (jika ada)
   - Handle error jika nomor HP tidak valid

5. **Kirim Summary ke Admin**
   - Kirim ringkasan ke max 3 admin (PM/Admin role)
   - Include jumlah task yang di-stop
   - Include daftar task (max 10)
   - Include statistik WhatsApp

## WhatsApp Notifications

### 1. Notifikasi ke Programmer

Setiap programmer yang tasknya dihentikan akan menerima:

```
Selamat sore John Doe,

🛑 TASK DIHENTIKAN SECARA OTOMATIS

📋 Kode Task: PROJ-001
🏢 Proyek: Website E-Commerce
📁 Modul: AUTH - Login Module
⏱️ Total Durasi: 120 menit

📝 Alasan:
Akhir jam kerja (16:00 WIB). Selamat beristirahat!

Task Anda telah dihentikan sementara. Anda dapat melanjutkan kembali kapan saja melalui sistem.

(Pesan otomatis dari Richz-Log)
```

### 2. Summary ke Admin

Admin akan menerima ringkasan:

```
Selamat sore,

🛑 LAPORAN AUTO-STOP TASK

📊 Ringkasan:
✅ Berhasil dihentikan: 5 task
❌ Gagal: 0 task
📱 WhatsApp terkirim: 4
📱 WhatsApp gagal: 1

📋 Daftar Task:
• PROJ-001 - John Doe
• PROJ-002 - Alice Johnson
• PROJ-003 - Bob Smith
• PROJ-004 - Charlie Brown
• PROJ-005 - Diana Lee

📝 Alasan:
Akhir jam kerja (16:00 WIB). Selamat beristirahat!

⏰ Waktu: 30/03/2024 16:00:00
🤖 Dipicu oleh: Cron Job (Automated)

(Pesan otomatis dari Richz-Log)
```

## Usage Examples

### cURL (Simple)

```bash
# Minimal request
curl -X POST https://log.expressa.id/api/tasklist/stop-all-active

# With reason
curl -X POST https://log.expressa.id/api/tasklist/stop-all-active \
  -H "Content-Type: application/json" \
  -d '{"reason":"Akhir jam kerja (16:00 WIB)"}'

# With all options
curl -X POST https://log.expressa.id/api/tasklist/stop-all-active \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Akhir jam kerja (16:00 WIB). Selamat beristirahat!",
    "sendAdminNotification": true
  }'
```

### JavaScript/TypeScript

```typescript
async function stopAllActiveTasks() {
  try {
    const response = await fetch('https://log.expressa.id/api/tasklist/stop-all-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Akhir jam kerja (16:00 WIB). Selamat beristirahat!',
        sendAdminNotification: true
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Stopped ${data.stoppedCount} tasks`);
      console.log(`📱 WhatsApp sent: ${data.whatsappSuccessCount}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Node.js Script (Cron Job)

```javascript
const fetch = require('node-fetch');

async function autoStopTasks() {
  const response = await fetch('https://log.expressa.id/api/tasklist/stop-all-active', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reason: 'Akhir jam kerja (16:00 WIB). Selamat beristirahat!',
      sendAdminNotification: true
    })
  });

  const result = await response.json();
  
  console.log(`[${new Date().toISOString()}] Auto-stop completed`);
  console.log(`Stopped: ${result.stoppedCount} tasks`);
  console.log(`WhatsApp sent: ${result.whatsappSuccessCount}`);
  
  return result;
}

// Run
autoStopTasks().catch(console.error);
```

### Health Check

```bash
# Check if service is running
curl https://log.expressa.id/api/tasklist/stop-all-active

# Response:
# {
#   "status": "ok",
#   "service": "stop-all-active-tasks",
#   "timestamp": "2024-03-30T10:30:00.000Z",
#   "activeTasksCount": 3,
#   "message": "Service is running. Use POST method to stop all active tasks."
# }
```

## Cron Expression Examples

```bash
# Setiap hari jam 4 sore (16:00)
0 16 * * *

# Setiap hari jam 6 sore (18:00)
0 18 * * *

# Senin-Jumat jam 5 sore (17:00)
0 17 * * 1-5

# Setiap hari jam 12 malam (00:00)
0 0 * * *

# Setiap hari jam 9 pagi (09:00)
0 9 * * *
```

## Database Changes

### tasklist Table
Setiap task yang dihentikan akan diupdate:
- `status` → `SEDANG_DIPROSES_USER_PAUSED`
- `pausedAt` → timestamp saat ini
- `totalDurationMinutes` → total durasi + durasi sesi saat ini
- `isPaused` → `true`

### tasklist_log Table
Setiap task akan mendapat log entry:
- `action` → `STOP_ALL`
- `keterangan` → "Task dihentikan secara massal oleh Cron Job (Automated). Alasan: [alasan]"
- `totalStartStopMinutes` → durasi sesi yang dihentikan
- `userId` → 1 (system user)

## Security

- ✅ Public endpoint (no authentication required)
- ✅ Audit trail (logged in tasklist_log)
- ✅ Non-blocking WhatsApp (tidak gagal jika WA error)
- ✅ Transaction safe (setiap task diproses independent)
- ⚠️ **IMPORTANT:** Karena public, pastikan endpoint ini tidak disalahgunakan
- 💡 **Recommendation:** Gunakan rate limiting di reverse proxy (nginx/cloudflare)

## Performance

- Proses sequential (satu per satu) untuk keamanan
- Non-blocking WhatsApp notification
- Detailed logging untuk monitoring
- Error handling per task (satu task gagal tidak affect yang lain)
- Admin notification limited to 3 recipients

## Monitoring & Logging

API ini menghasilkan log detail di console:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StopAllActive] 🛑 Starting stop all active tasks process
[StopAllActive] Initiated by: Cron Job (Automated)
[StopAllActive] Reason: Akhir jam kerja (16:00 WIB)
[StopAllActive] Timestamp: 30/03/2024 16:00:00
[StopAllActive] 📋 Found 5 active tasks
[StopAllActive] Processing task 446...
[StopAllActive] ✅ Task 446 stopped successfully
[StopAllActive] ✅ WhatsApp sent to John Doe
[StopAllActive] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StopAllActive] 📊 Summary:
[StopAllActive] Total tasks: 5
[StopAllActive] Successfully stopped: 5
[StopAllActive] Failed: 0
[StopAllActive] WhatsApp sent: 4
[StopAllActive] WhatsApp failed: 1
[StopAllActive] 📱 Summary notification sent to 3 admin(s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### Error 500: Internal Server Error

**Penyebab:** Error di aplikasi

**Solusi:**
1. Cek logs aplikasi: `pm2 logs richz-log`
2. Cek database connection
3. Cek apakah ada task aktif yang corrupt

### Cron Tidak Jalan

**Penyebab:** Cron service tidak aktif atau salah config

**Solusi:**
1. Cek cron service dashboard (cron-job.org, EasyCron, dll)
2. Cek execution history
3. Test manual dengan curl
4. Cek timezone setting

### WhatsApp Tidak Terkirim

**Penyebab:** Nomor HP tidak valid atau service n8n down

**Solusi:**
1. Cek nomor HP programmer di database
2. Cek service n8n: https://n8n.expressa.id
3. Lihat field `whatsappError` di response
4. Task tetap akan di-stop meskipun WA gagal

## Customization

### Ubah Jam Eksekusi

Ganti cron expression:

```bash
# Jam 5 sore (17:00)
0 17 * * *

# Jam 6 sore (18:00)
0 18 * * *

# Jam 12 malam (00:00)
0 0 * * *

# Senin-Jumat jam 5 sore
0 17 * * 1-5
```

### Ubah Pesan Alasan

Edit request body:

```json
{
  "reason": "Pesan custom anda di sini",
  "sendAdminNotification": true
}
```

### Disable Admin Notification

```json
{
  "reason": "Akhir jam kerja",
  "sendAdminNotification": false
}
```

## Notes

- Task yang sudah di-pause tidak akan diproses lagi (hanya yang aktif)
- Programmer bisa melanjutkan task kapan saja dengan tombol "Resume"
- Total durasi tetap tersimpan, tidak hilang
- WhatsApp notification bersifat best-effort (tidak wajib berhasil)
- API ini idempotent - aman dipanggil berkali-kali
- **PUBLIC ENDPOINT** - Tidak perlu authentication apapun
