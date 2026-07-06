# 📮 Postman Collection: Stop All Tasks API

Panduan lengkap untuk menggunakan Postman Collection Stop All Tasks API.

## 📦 Files

1. **`Stop-All-Tasks-API.postman_collection.json`** - Main collection
2. **`Stop-All-Tasks-Development.postman_environment.json`** - Development environment
3. **`Stop-All-Tasks-Production.postman_environment.json`** - Production environment

## 🚀 Quick Start

### 1. Import Collection

1. Buka Postman
2. Klik **Import** (top left)
3. Drag & drop atau pilih file:
   - `Stop-All-Tasks-API.postman_collection.json`
4. Klik **Import**

### 2. Import Environments

1. Klik **Import** lagi
2. Pilih kedua environment files:
   - `Stop-All-Tasks-Development.postman_environment.json`
   - `Stop-All-Tasks-Production.postman_environment.json`
3. Klik **Import**

### 3. Select Environment

Di top-right corner Postman:
- Pilih **"Stop All Tasks - Development"** untuk local testing
- Pilih **"Stop All Tasks - Production"** untuk production

### 4. Run Requests

Collection sudah siap digunakan! 🎉

## 📋 Available Requests

### 1. Health Check & Statistics
```
GET {{base_url}}/api/cron/stop-all-tasks
```

**Purpose:** Check service status dan lihat statistik

**Response:**
```json
{
  "status": "healthy",
  "service": "stop-all-tasks",
  "timestamp": "2024-01-15T09:00:00.000Z",
  "stats": {
    "lastRun": "2024-01-15T09:00:00.000Z",
    "totalStoppedToday": 15,
    "totalStoppedThisWeek": 75,
    "totalStoppedThisMonth": 300
  }
}
```

**Tests Included:**
- ✅ Status code is 200
- ✅ Response has status field
- ✅ Response has stats

---

### 2. Stop All Tasks (No Body)
```
POST {{base_url}}/api/cron/stop-all-tasks
```

**Purpose:** Stop semua task dengan default settings

**Body:** Empty (menggunakan default reason)

**Response:**
```json
{
  "success": true,
  "message": "Successfully stopped 5 active tasks",
  "data": {
    "stoppedCount": 5,
    "notificationsSent": 5,
    "notificationsFailed": 0,
    "timestamp": "2024-01-15T09:00:00.000Z"
  },
  "tasks": [...]
}
```

**Tests Included:**
- ✅ Status code is 200
- ✅ Response has success field
- ✅ Response has data object
- ✅ Response has tasks array

---

### 3. Stop All Tasks (With Custom Reason)
```
POST {{base_url}}/api/cron/stop-all-tasks
```

**Purpose:** Stop semua task dengan custom reason

**Body:**
```json
{
  "reason": "Akhir jam kerja (16:00 WIB). Selamat beristirahat!",
  "sendAdminNotification": true
}
```

**Use Cases:**
- End of work hours (16:00 WIB)
- Scheduled maintenance
- Custom messages untuk programmer

**Tests Included:**
- ✅ Status code is 200
- ✅ Response indicates success
- ✅ Stopped count is a number

---

### 4. Stop All Tasks (No Admin Notification)
```
POST {{base_url}}/api/cron/stop-all-tasks
```

**Purpose:** Stop task tanpa notifikasi ke admin

**Body:**
```json
{
  "reason": "Test manual - no admin notification",
  "sendAdminNotification": false
}
```

**Use Cases:**
- Testing/development
- Manual stop tanpa alert admin
- Scheduled maintenance

**Note:** Programmer tetap menerima notifikasi individual

---

### 5. Stop All Tasks (Emergency)
```
POST {{base_url}}/api/cron/stop-all-tasks
```

**Purpose:** Emergency stop dengan pesan urgent

**Body:**
```json
{
  "reason": "🚨 EMERGENCY STOP - Server maintenance dimulai segera.",
  "sendAdminNotification": true
}
```

**Use Cases:**
- Server maintenance
- Emergency deployment
- Critical bug fix
- System upgrade

## 🌍 Environments

### Development Environment

```json
{
  "base_url": "http://localhost:3000",
  "environment": "development",
  "skip_whatsapp": "true"
}
```

**Features:**
- Local server (localhost:3000)
- WhatsApp notifications di-skip (untuk testing)
- Safe untuk testing tanpa mengirim WA sebenarnya

### Production Environment

```json
{
  "base_url": "https://log.expressa.id",
  "environment": "production",
  "skip_whatsapp": "false"
}
```

**Features:**
- Production server
- WhatsApp notifications aktif
- Real notifications akan terkirim

## 🧪 Testing

### Run All Tests

1. Pilih collection "Stop All Tasks API"
2. Klik **Run** (top right)
3. Pilih requests yang ingin di-test
4. Klik **Run Stop All Tasks API**

### Test Results

Setiap request memiliki automated tests:
- ✅ Status code validation
- ✅ Response structure validation
- ✅ Data type validation

### Example Test Output

```
✓ Status code is 200
✓ Response has status field
✓ Response has stats
✓ Response has success field
✓ Response has data object
✓ Response has tasks array
```

## 📊 Response Examples

### Success - No Active Tasks

```json
{
  "success": true,
  "message": "Successfully stopped 0 active tasks",
  "data": {
    "stoppedCount": 0,
    "notificationsSent": 0,
    "notificationsFailed": 0,
    "timestamp": "2024-01-15T09:00:00.000Z"
  },
  "tasks": []
}
```

### Success - Tasks Stopped

```json
{
  "success": true,
  "message": "Successfully stopped 5 active tasks",
  "data": {
    "stoppedCount": 5,
    "notificationsSent": 5,
    "notificationsFailed": 0,
    "timestamp": "2024-01-15T09:00:00.000Z"
  },
  "tasks": [
    {
      "id": 123,
      "kode": "PRJ-001-1",
      "programmer": "John Doe",
      "project": "Project Alpha",
      "module": "User Management",
      "sessionDuration": "45 minutes",
      "totalDuration": "120 minutes"
    },
    {
      "id": 124,
      "kode": "PRJ-002-3",
      "programmer": "Jane Smith",
      "project": "Project Beta",
      "module": "API Integration",
      "sessionDuration": "30 minutes",
      "totalDuration": "90 minutes"
    }
  ]
}
```

### Error Response

```json
{
  "success": false,
  "error": "Server error",
  "message": "Database connection failed"
}
```

## 🎯 Common Use Cases

### 1. Daily End of Work (16:00 WIB)

**Request:** Stop All Tasks (With Custom Reason)

**Body:**
```json
{
  "reason": "Akhir jam kerja (16:00 WIB). Selamat beristirahat!",
  "sendAdminNotification": true
}
```

**Expected:**
- All active tasks stopped
- Programmers receive individual WA
- Admin receives summary WA

---

### 2. Testing (Development)

**Request:** Stop All Tasks (No Admin Notification)

**Environment:** Development

**Body:**
```json
{
  "reason": "Test manual",
  "sendAdminNotification": false
}
```

**Expected:**
- Tasks stopped
- No actual WhatsApp sent (skip mode)
- No admin notification

---

### 3. Emergency Maintenance

**Request:** Stop All Tasks (Emergency)

**Body:**
```json
{
  "reason": "🚨 EMERGENCY - Server maintenance",
  "sendAdminNotification": true
}
```

**Expected:**
- Immediate stop all tasks
- Urgent notifications sent
- Admin alerted

---

### 4. Health Check

**Request:** Health Check & Statistics

**Expected:**
- Service status
- Last run timestamp
- Statistics (today/week/month)

## 🔧 Troubleshooting

### Issue: Connection Refused

**Cause:** Server tidak running

**Solution:**
```bash
# Start development server
npm run dev
```

---

### Issue: 404 Not Found

**Cause:** Wrong URL atau endpoint belum deployed

**Solution:**
- Check environment: `{{base_url}}`
- Verify endpoint: `/api/cron/stop-all-tasks`
- Ensure code deployed to production

---

### Issue: Tests Failing

**Cause:** Response structure berbeda

**Solution:**
- Check response di "Body" tab
- Verify API implementation
- Update tests jika API berubah

---

### Issue: WhatsApp Not Sent (Development)

**Cause:** Skip mode aktif

**Solution:**
- Normal behavior untuk development
- Set `SKIP_WHATSAPP=false` di .env untuk test real WA
- Use production environment untuk real notifications

## 📝 Tips & Best Practices

### 1. Use Environments

Selalu pilih environment yang sesuai:
- **Development** untuk local testing
- **Production** untuk real operations

### 2. Check Health First

Sebelum stop tasks, check health endpoint dulu:
```
GET {{base_url}}/api/cron/stop-all-tasks
```

### 3. Test Without Admin Notification

Untuk testing, disable admin notification:
```json
{
  "sendAdminNotification": false
}
```

### 4. Monitor Response

Perhatikan response fields:
- `stoppedCount` - Berapa task yang dihentikan
- `notificationsSent` - Berapa notifikasi terkirim
- `notificationsFailed` - Berapa notifikasi gagal

### 5. Save Responses

Klik **Save Response** untuk dokumentasi:
- Success cases
- Error cases
- Edge cases

## 🔗 Related Documentation

- **Full API Docs:** `docs/API_STOP_ALL_TASKS.md`
- **Quick Setup:** `docs/QUICK_SETUP_STOP_ALL_TASKS.md`
- **Implementation:** `IMPLEMENTATION_STOP_ALL_TASKS.md`
- **Test Script:** `test-stop-all-tasks.js`

## 📞 Support

Jika ada masalah:
1. Check console logs di server
2. Verify database connection
3. Test dengan curl command
4. Check WhatsApp service status

## ✅ Checklist

- [ ] Collection imported
- [ ] Environments imported
- [ ] Development environment selected
- [ ] Health check successful
- [ ] Stop all tasks tested (no body)
- [ ] Stop all tasks tested (with body)
- [ ] All tests passing
- [ ] Production environment tested (optional)

## 🎉 Ready to Use!

Postman collection sudah siap digunakan untuk testing dan monitoring Stop All Tasks API!

---

**Created:** 2024-01-15
**Version:** 1.0.0
**Requests:** 5 endpoints
**Tests:** 15+ automated tests
