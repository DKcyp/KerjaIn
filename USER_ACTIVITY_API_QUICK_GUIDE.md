# 📊 Panduan Cepat API Aktivitas Harian User

## 🎯 Ringkasan
API untuk mendapatkan ringkasan aktivitas user pada hari tertentu di RichzLog. Response berupa teks yang sudah diformat dengan rapi dan mudah dibaca.

## 🔗 Endpoint
```
GET /api/user-activity/daily
```

## 📝 Parameter

| Parameter | Tipe | Wajib | Contoh | Keterangan |
|-----------|------|-------|--------|------------|
| userId | number | ✅ Ya | 123 | ID user RichzLog |
| date | string | ✅ Ya | 2024-01-15 | Format: YYYY-MM-DD |

## 🔐 Autentikasi
API mendukung beberapa metode autentikasi:

1. **X-API-Key** (Recommended untuk mobile)
   ```
   x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
   ```

2. **Cookie Session** (untuk web)
   ```
   Cookie: session=<token>
   ```

3. **Authorization Bearer**
   ```
   Authorization: Bearer <token>
   ```

User hanya bisa melihat aktivitas sendiri kecuali role ADMIN/PM.

## 📤 Contoh Request

### cURL dengan X-API-Key
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

### JavaScript
```javascript
const response = await fetch(
  '/api/user-activity/daily?userId=123&date=2024-01-15',
  { credentials: 'include' }
);
const data = await response.json();
console.log(data.data.summary); // Tampilkan summary
```

### Flutter/Dart
```dart
final response = await http.get(
  Uri.parse('https://api.richzlog.com/api/user-activity/daily?userId=123&date=2024-01-15'),
  headers: {
    'x-api-key': '172dc4710ab54af8b1b405c89d6de9f0',
    'Content-Type': 'application/json',
  },
);

if (response.statusCode == 200) {
  final data = json.decode(response.body);
  print(data['data']['summary']); // Tampilkan summary
}
```

## 📥 Response Success (200)

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
    "summary": "📊 RINGKASAN AKTIVITAS HARIAN\n...",
    "activities": [...],
    "statistics": {
      "totalTasks": 3,
      "totalActivities": 12,
      "totalWorkMinutes": 330
    }
  }
}
```

### Format Summary
Summary sudah diformat dengan rapi dan berisi:
- 👤 Nama user dan role
- 📅 Tanggal (format Indonesia)
- 📈 Statistik total task dan waktu kerja
- 📋 Detail setiap task dengan:
  - Kode task dan nama project
  - Module yang dikerjakan
  - Durasi kerja
  - Status terakhir
  - Aktivitas terakhir

### Contoh Summary Text
```
📊 RINGKASAN AKTIVITAS HARIAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 User: John Doe (PROGRAMMER)
📅 Tanggal: Senin, 15 Januari 2024

📈 STATISTIK:
   • Total Task Dikerjakan: 3 task
   • Total Waktu Kerja: 5 jam 30 menit

📋 DETAIL AKTIVITAS:

1. TSK-001 - Project Alpha
   📦 Module: User Management
   📝 Keterangan: Implementasi login feature
   ⏱️  Durasi: 2j 15m
   📊 Status: ✅ Selesai
   🔄 Jumlah Aktivitas: 5x
   📌 Aktivitas Terakhir:
      • 14:30 - STOP: Selesai testing
      • 13:00 - START: Mulai development
      • 09:00 - CREATE: Task dibuat

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ringkasan berhasil dibuat
```

## ❌ Error Responses

| Status | Error | Solusi |
|--------|-------|--------|
| 400 | Parameter tidak lengkap | Pastikan userId dan date diisi |
| 400 | Format tanggal salah | Gunakan format YYYY-MM-DD |
| 401 | Session tidak valid | Login ulang untuk mendapatkan session baru |
| 403 | Tidak ada akses | User hanya bisa lihat aktivitas sendiri |
| 404 | User tidak ditemukan | Periksa userId yang digunakan |

## 🎨 Status Task dengan Emoji

| Status | Emoji | Keterangan |
|--------|-------|------------|
| MENUNGGU_PROSES_USER | ⏳ | Menunggu Proses |
| SEDANG_DIPROSES_USER | 🔄 | Sedang Diproses |
| SEDANG_DIPROSES_USER_PAUSED | ⏸️ | Paused |
| MENUNGGU_REVIEW_PM | 👀 | Menunggu Review |
| SELESAI | ✅ | Selesai |

## 🔧 Testing

### Menggunakan Postman
1. Import collection: `RichzLog_User_Activity_API.postman_collection.json`
2. Import environment: `RichzLog_User_Activity_Environment.json`
3. Set variable `user_id` dan `date`
4. Run request

### Menggunakan Node.js Script
```bash
# Edit test-user-activity-api.js untuk set USER_ID dan DATE
node test-user-activity-api.js
```

## 💡 Tips Penggunaan

1. **Untuk Mobile App**: Gunakan summary text untuk ditampilkan langsung di UI
2. **Untuk Dashboard**: Gunakan statistics untuk chart/grafik
3. **Untuk Detail**: Gunakan activities array untuk list detail
4. **Timezone**: Semua waktu dalam UTC, convert ke local timezone jika perlu
5. **Performance**: API sudah dioptimasi, response cepat bahkan untuk banyak aktivitas

## 📱 Contoh Implementasi Flutter

```dart
class UserActivityService {
  final String baseUrl;
  final String apiKey;

  UserActivityService(this.baseUrl, this.apiKey);

  Future<Map<String, dynamic>> getDailyActivity(int userId, String date) async {
    final url = Uri.parse('$baseUrl/api/user-activity/daily?userId=$userId&date=$date');
    
    final response = await http.get(
      url,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load activity: ${response.body}');
    }
  }

  // Get today's activity
  Future<Map<String, dynamic>> getTodayActivity(int userId) async {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    return getDailyActivity(userId, today);
  }
}

// Widget untuk menampilkan summary
class ActivitySummaryWidget extends StatelessWidget {
  final String summary;

  const ActivitySummaryWidget({required this.summary});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          summary,
          style: TextStyle(
            fontFamily: 'monospace', // Untuk format yang rapi
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}
```

## 🆘 Troubleshooting

### Problem: Response 401 Unauthorized
**Solusi**: 
- Pastikan session cookie valid
- Login ulang jika session expired
- Periksa cookie header di request

### Problem: Response 403 Forbidden
**Solusi**:
- User hanya bisa lihat aktivitas sendiri
- Gunakan userId yang sesuai dengan session
- Atau gunakan akun ADMIN/PM untuk lihat user lain

### Problem: Tidak ada aktivitas padahal ada
**Solusi**:
- Periksa format tanggal (harus YYYY-MM-DD)
- Periksa timezone (API menggunakan UTC)
- Pastikan userId benar

### Problem: Summary tidak rapi di mobile
**Solusi**:
- Gunakan font monospace
- Set text alignment ke left
- Gunakan ScrollView jika terlalu panjang

## 📞 Support

Untuk pertanyaan atau issue:
- Buka issue di repository
- Hubungi tim development RichzLog
- Lihat dokumentasi lengkap di `USER_DAILY_ACTIVITY_API.md`

## 📚 File Terkait

- Dokumentasi lengkap: `docs/api-for-flutter/USER_DAILY_ACTIVITY_API.md`
- Postman collection: `RichzLog_User_Activity_API.postman_collection.json`
- Environment: `RichzLog_User_Activity_Environment.json`
- Test script: `test-user-activity-api.js`
