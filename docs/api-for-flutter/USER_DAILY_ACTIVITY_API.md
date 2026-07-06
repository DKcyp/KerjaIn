# API Aktivitas Harian User - RichzLog

## Overview
API ini digunakan untuk mendapatkan ringkasan aktivitas user pada hari tertentu, termasuk semua tasklist yang dikerjakan, durasi kerja, dan detail aktivitas.

## Endpoint

### GET /api/user-activity/daily

Mendapatkan ringkasan aktivitas user pada tanggal tertentu.

## Authentication
API ini mendukung beberapa metode autentikasi:

1. **Cookie Session** (untuk web browser)
   ```
   Cookie: session=<session_token>
   ```

2. **X-API-Key Header** (recommended untuk mobile/API)
   ```
   x-api-key: <api_token>
   ```

3. **Authorization Bearer** (standard OAuth)
   ```
   Authorization: Bearer <token>
   ```

4. **X-Mobile-Token** (untuk mobile app)
   ```
   x-mobile-token: <token>
   ```

User hanya bisa melihat aktivitas sendiri kecuali memiliki role ADMIN, SUPER_ADMIN, atau PM.

### Hardcoded API Key (Development/Testing)
Untuk development dan testing, Anda bisa menggunakan API key hardcoded:
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

**Note**: API key ini hanya untuk development. Untuk production, gunakan signed token yang proper.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | number | Yes | ID user yang ingin dilihat aktivitasnya |
| date | string | Yes | Tanggal dalam format YYYY-MM-DD (contoh: 2024-01-15) |

### Headers
```
# Method 1: Cookie (untuk web)
Cookie: session=<session_token>

# Method 2: X-API-Key (recommended untuk mobile)
x-api-key: <api_token>

# Method 3: Authorization Bearer
Authorization: Bearer <token>

# Method 4: X-Mobile-Token
x-mobile-token: <token>
```

### Hardcoded API Key (Development)
Untuk testing, gunakan:
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "nama": "John Doe",
      "noUrut": 1001,
      "role": "PROGRAMMER"
    },
    "date": "2024-01-15",
    "summary": "📊 RINGKASAN AKTIVITAS HARIAN\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 User: John Doe (PROGRAMMER)\n📅 Tanggal: Senin, 15 Januari 2024\n\n📈 STATISTIK:\n   • Total Task Dikerjakan: 3 task\n   • Total Waktu Kerja: 5 jam 30 menit\n\n📋 DETAIL AKTIVITAS:\n\n1. TSK-001 - Project Alpha\n   📦 Module: User Management\n   📝 Keterangan: Implementasi login feature\n   ⏱️  Durasi: 2j 15m\n   📊 Status: ✅ Selesai\n   🔄 Jumlah Aktivitas: 5x\n   📌 Aktivitas Terakhir:\n      • 14:30 - STOP: Selesai testing\n      • 13:00 - START: Mulai development\n      • 09:00 - CREATE: Task dibuat\n\n2. TSK-002 - Project Beta\n   📦 Module: Dashboard\n   📝 Keterangan: Fix bug pada chart\n   ⏱️  Durasi: 1j 45m\n   📊 Status: 🔄 Sedang Diproses\n   🔄 Jumlah Aktivitas: 3x\n   📌 Aktivitas Terakhir:\n      • 16:00 - PAUSE: Break\n      • 15:00 - START: Mulai fix bug\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ Ringkasan berhasil dibuat",
    "activities": [
      {
        "taskId": 446,
        "taskCode": "TSK-001",
        "projectName": "Project Alpha",
        "moduleName": "User Management",
        "keterangan": "Implementasi login feature",
        "status": "SELESAI",
        "totalDurationMinutes": 135,
        "activityCount": 5,
        "activities": [
          {
            "time": "2024-01-15T09:00:00.000Z",
            "action": "CREATE",
            "keterangan": "Task dibuat",
            "status": "MENUNGGU_PROSES_USER"
          },
          {
            "time": "2024-01-15T13:00:00.000Z",
            "action": "START",
            "keterangan": "Mulai development",
            "status": "SEDANG_DIPROSES_USER"
          },
          {
            "time": "2024-01-15T14:30:00.000Z",
            "action": "STOP",
            "keterangan": "Selesai testing",
            "status": "SELESAI"
          }
        ]
      }
    ],
    "statistics": {
      "totalTasks": 3,
      "totalActivities": 12,
      "totalWorkMinutes": 330
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Parameter tidak lengkap
```json
{
  "error": "Parameter userId dan date wajib diisi"
}
```

#### 400 Bad Request - Format tanggal salah
```json
{
  "error": "Format tanggal harus YYYY-MM-DD"
}
```

#### 401 Unauthorized - Session tidak valid
```json
{
  "error": "Unauthorized - Session tidak valid"
}
```

#### 403 Forbidden - Tidak ada akses
```json
{
  "error": "Anda tidak memiliki akses untuk melihat aktivitas user ini"
}
```

#### 404 Not Found - User tidak ditemukan
```json
{
  "error": "User tidak ditemukan"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Terjadi kesalahan saat mengambil data aktivitas",
  "details": "Error message details"
}
```

## 📤 Contoh Request

### cURL dengan X-API-Key (Recommended)
```bash
curl -X GET "http://localhost:3000/api/user-activity/daily?userId=123&date=2024-01-15" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0" \
  -H "Content-Type: application/json"
```

### cURL dengan Cookie
```bash
curl -X GET "http://localhost:3000/api/user-activity/daily?userId=123&date=2024-01-15" \
  -H "Cookie: session=your_session_token"
```

### JavaScript/Fetch
```javascript
const userId = 123;
const date = '2024-01-15';

fetch(`/api/user-activity/daily?userId=${userId}&date=${date}`, {
  method: 'GET',
  credentials: 'include', // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => {
    console.log('Summary:', data.data.summary);
    console.log('Activities:', data.data.activities);
  })
  .catch(error => console.error('Error:', error));
```

### Flutter/Dart
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<Map<String, dynamic>> getUserDailyActivity(int userId, String date) async {
  final url = Uri.parse(
    'https://your-domain.com/api/user-activity/daily?userId=$userId&date=$date'
  );
  
  // Method 1: Menggunakan x-api-key (Recommended)
  final response = await http.get(
    url,
    headers: {
      'x-api-key': '172dc4710ab54af8b1b405c89d6de9f0',
      'Content-Type': 'application/json',
    },
  );
  
  // Method 2: Menggunakan Cookie (alternatif)
  // final response = await http.get(
  //   url,
  //   headers: {
  //     'Cookie': 'session=your_session_token',
  //     'Content-Type': 'application/json',
  //   },
  // );
  
  if (response.statusCode == 200) {
    return json.decode(response.body);
  } else {
    throw Exception('Failed to load activity: ${response.body}');
  }
}

// Penggunaan
void main() async {
  try {
    final result = await getUserDailyActivity(123, '2024-01-15');
    print('Summary:\n${result['data']['summary']}');
    
    // Tampilkan statistik
    final stats = result['data']['statistics'];
    print('\nTotal Tasks: ${stats['totalTasks']}');
    print('Total Work Time: ${stats['totalWorkMinutes']} minutes');
    
  } catch (e) {
    print('Error: $e');
  }
}
```

## Response Fields Explanation

### User Object
- `id`: ID user
- `nama`: Nama lengkap user
- `noUrut`: Nomor urut pegawai
- `role`: Role user (PROGRAMMER, PM, ADMIN, dll)

### Summary String
String yang sudah diformat dengan rapi berisi:
- Header dengan nama user dan tanggal
- Statistik total task dan waktu kerja
- Detail setiap task dengan emoji untuk visual yang lebih baik
- Aktivitas terakhir per task

### Activities Array
Array berisi detail setiap task yang dikerjakan:
- `taskId`: ID task
- `taskCode`: Kode task (TSK-XXX)
- `projectName`: Nama project
- `moduleName`: Nama module
- `keterangan`: Deskripsi task
- `status`: Status terakhir task
- `totalDurationMinutes`: Total durasi kerja dalam menit
- `activityCount`: Jumlah aktivitas yang dilakukan
- `activities`: Array detail aktivitas (time, action, keterangan, status)

### Statistics Object
- `totalTasks`: Total jumlah task yang dikerjakan
- `totalActivities`: Total jumlah aktivitas/log
- `totalWorkMinutes`: Total waktu kerja dalam menit

## Status Task

| Status | Emoji | Deskripsi |
|--------|-------|-----------|
| MENUNGGU_PROSES_USER | ⏳ | Menunggu Proses |
| SEDANG_DIPROSES_USER | 🔄 | Sedang Diproses |
| SEDANG_DIPROSES_USER_PAUSED | ⏸️ | Sedang Diproses (Paused) |
| MENUNGGU_REVIEW_PM | 👀 | Menunggu Review PM |
| SELESAI | ✅ | Selesai |

## Action Types

Beberapa action yang mungkin muncul:
- `CREATE`: Task dibuat
- `START`: Mulai mengerjakan task
- `STOP`: Berhenti mengerjakan task
- `PAUSE`: Pause task
- `RESUME`: Lanjutkan task
- `UPDATE`: Update task
- `COMPLETE`: Selesaikan task
- `REVIEW`: Review task

## Notes

1. **Authorization**: User hanya bisa melihat aktivitas sendiri kecuali memiliki role ADMIN, SUPER_ADMIN, atau PM
2. **Timezone**: Semua waktu menggunakan timezone server
3. **Date Range**: API mengambil data dari jam 00:00:00 sampai 23:59:59 pada tanggal yang ditentukan
4. **Summary Format**: Summary sudah diformat dengan emoji dan line breaks untuk tampilan yang rapi
5. **Performance**: API sudah dioptimasi dengan menggunakan Map untuk lookup cepat

## Testing

Gunakan Postman collection yang disediakan: `RichzLog_User_Activity_API.postman_collection.json`

## Support

Untuk pertanyaan atau issue, hubungi tim development RichzLog.
