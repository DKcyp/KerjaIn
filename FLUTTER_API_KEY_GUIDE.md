# 🔑 Panduan Menggunakan API Key untuk Flutter App

## ❌ Masalah yang Terjadi

Flutter app menggunakan **session token** (`172dc4710ab54af8b1b405c89d6de9f0`) yang seharusnya menggunakan **static API key** (`pm-key-2024`).

```dart
// ❌ SALAH - Ini session token, bukan API key
'Cookie': 'session=pm-key-2024'  // Tapi value-nya masih salah
'x-api-key': '172dc4710ab54af8b1b405c89d6de9f0'  // Ini session token!
```

## ✅ Solusi: Gunakan Static API Key

Backend sudah mendukung 3 static API key untuk mobile app:

| API Key | Role | User ID | Nama |
|---------|------|---------|------|
| `pm-key-2024` | PM | 1 | PM Mobile User |
| `admin-key-2024` | SUPER_ADMIN | 1 | Admin Mobile User |
| `programmer-key-2024` | PROGRAMMER | 2 | Programmer Mobile User |

## 🚀 Cara Menggunakan di Flutter

### Metode 1: Cookie Session (Recommended)

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class TasklistService {
  static const String baseUrl = 'https://log-trial.