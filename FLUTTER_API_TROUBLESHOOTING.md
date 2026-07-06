# Flutter API Troubleshooting - Error 401 Fix

## 🚨 Problem: Error 401 dari Flutter App

Jika Anda mendapat error 401 saat memanggil API approval dari Flutter app, berikut solusinya:

## 🔍 Kemungkinan Penyebab

### 1. **Session Token Expired/Invalid**
```dart
// Cek apakah token masih valid
final response = await http.get(
  Uri.parse('http://192.168.1.10:3000/api/auth/me'),
  headers: {'Cookie': 'session=172dc4710ab54af8b1b405c89d6de9f0'},
);

if (response.statusCode == 401) {
  print('Token expired - need to login again');
}
```

### 2. **Format Cookie Header Salah**
```dart
// ❌ SALAH
headers: {'Cookie': 'session = 172dc4710ab54af8b1b405c89d6de9f0'}

// ✅ BENAR
headers: {'Cookie': 'session=172dc4710ab54af8b1b405c89d6de9f0'}
```

### 3. **Network/CORS Issues**
```dart
// Tambahkan error handling yang lebih detail
try {
  final response = await http.get(uri, headers: headers);
  print('Status Code: ${response.statusCode}');
  print('Response Body: ${response.body}');
  print('Response Headers: ${response.headers}');
} catch (e) {
  print('Network Error: $e');
}
```

## 🛠️ Solusi Step-by-Step

### Step 1: Test Koneksi Basic
```dart
// lib/utils/api_test.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiTest {
  static const String baseUrl = 'http://192.168.1.10:3000';
  static const String sessionToken = '172dc4710ab54af8b1b405c89d6de9f0';

  static Future<void> testConnection() async {
    print('🔍 Testing API Connection...');
    
    // Test 1: Basic connectivity
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/auth/me'));
      print('✅ Server reachable - Status: ${response.statusCode}');
    } catch (e) {
      print('❌ Server unreachable: $e');
      return;
    }

    // Test 2: Authentication
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/me'),
        headers: {'Cookie': 'session=$sessionToken'},
      );
      
      if (response.statusCode == 200) {
        final user = json.decode(response.body);
        print('✅ Authentication OK - User: ${user['namaLengkap']} (${user['role']})');
      } else {
        print('❌ Authentication failed - Status: ${response.statusCode}');
        print('Response: ${response.body}');
      }
    } catch (e) {
      print('❌ Auth test error: $e');
    }

    // Test 3: Approval Queue
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/tasklist/approval-queue'),
        headers: {'Cookie': 'session=$sessionToken'},
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ Approval Queue OK - Found ${data['total']} tasks');
      } else {
        print('❌ Approval Queue failed - Status: ${response.statusCode}');
        print('Response: ${response.body}');
      }
    } catch (e) {
      print('❌ Approval queue test error: $e');
    }

    // Test 4: Task Approval
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/tasklist/1'),
        headers: {
          'Cookie': 'session=$sessionToken',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'status': 'SELESAI',
          'keterangan': 'Flutter test approval',
        }),
      );
      
      if (response.statusCode == 200) {
        print('✅ Task Approval OK');
      } else {
        print('❌ Task Approval failed - Status: ${response.statusCode}');
        print('Response: ${response.body}');
      }
    } catch (e) {
      print('❌ Task approval test error: $e');
    }
  }
}
```

### Step 2: Panggil Test di Main App
```dart
// lib/main.dart
import 'utils/api_test.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Test API connection saat app start
  await ApiTest.testConnection();
  
  runApp(MyApp());
}
```

### Step 3: Improved API Service dengan Retry
```dart
// lib/services/robust_approval_api_service.dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class RobustApprovalApiService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  static const String sessionToken = '172dc4710ab54af8b1b405c89d6de9f0';
  static const int maxRetries = 3;
  static const Duration timeout = Duration(seconds: 30);

  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Cookie': 'session=$sessionToken',
    'User-Agent': 'Flutter-App/1.0',
  };

  Future<Map<String, dynamic>> _makeRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    final uri = Uri.parse('$baseUrl$endpoint')
        .replace(queryParameters: queryParams);

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        print('🔄 Attempt $attempt/$maxRetries: $method $endpoint');
        
        http.Response response;
        
        switch (method.toUpperCase()) {
          case 'GET':
            response = await http.get(uri, headers: headers)
                .timeout(timeout);
            break;
          case 'PUT':
            response = await http.put(
              uri,
              headers: headers,
              body: body != null ? json.encode(body) : null,
            ).timeout(timeout);
            break;
          default:
            throw Exception('Unsupported HTTP method: $method');
        }

        print('📊 Response: ${response.statusCode} - ${response.reasonPhrase}');
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return json.decode(response.body);
        } else if (response.statusCode == 401) {
          throw AuthenticationException();
        } else if (response.statusCode == 403) {
          throw PermissionException('Access denied');
        } else if (response.statusCode == 404) {
          throw NotFoundException('Resource not found');
        } else {
          // Try to parse error message
          try {
            final errorBody = json.decode(response.body);
            throw ApiException(
              errorBody['error'] ?? 'HTTP ${response.statusCode}',
              response.statusCode,
            );
          } catch (_) {
            throw ApiException(
              'HTTP ${response.statusCode}: ${response.reasonPhrase}',
              response.statusCode,
            );
          }
        }
      } on SocketException catch (e) {
        print('🌐 Network error (attempt $attempt): $e');
        if (attempt == maxRetries) {
          throw ApiException('Network connection failed. Please check your internet connection.');
        }
        await Future.delayed(Duration(seconds: attempt));
      } on TimeoutException catch (e) {
        print('⏱️ Timeout error (attempt $attempt): $e');
        if (attempt == maxRetries) {
          throw ApiException('Request timeout. Please try again.');
        }
        await Future.delayed(Duration(seconds: attempt));
      } on FormatException catch (e) {
        print('📝 JSON parsing error: $e');
        throw ApiException('Invalid response format from server');
      } catch (e) {
        print('❌ Unexpected error (attempt $attempt): $e');
        if (attempt == maxRetries) {
          rethrow;
        }
        await Future.delayed(Duration(seconds: attempt));
      }
    }

    throw ApiException('Max retries exceeded');
  }

  Future<Map<String, dynamic>> getApprovalQueue({
    int? projectId,
    int page = 1,
    int size = 10,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
    };
    
    if (projectId != null) {
      queryParams['projectId'] = projectId.toString();
    }

    return await _makeRequest('GET', '/api/tasklist/approval-queue',
        queryParams: queryParams);
  }

  Future<Map<String, dynamic>> approveTask(int taskId, String keterangan) async {
    return await _makeRequest('PUT', '/api/tasklist/$taskId', body: {
      'status': 'SELESAI',
      'keterangan': keterangan,
    });
  }

  Future<Map<String, dynamic>> rejectTask(int taskId, String keterangan) async {
    return await _makeRequest('PUT', '/api/tasklist/$taskId', body: {
      'status': 'MENUNGGU_PROSES_USER',
      'keterangan': keterangan,
    });
  }
}

// Exception classes
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  
  ApiException(this.message, [this.statusCode]);
  
  @override
  String toString() => message;
}

class AuthenticationException extends ApiException {
  AuthenticationException() : super('Session expired. Please login again.', 401);
}

class PermissionException extends ApiException {
  PermissionException(String message) : super(message, 403);
}

class NotFoundException extends ApiException {
  NotFoundException(String message) : super(message, 404);
}
```

## 🔧 Quick Debug Widget

### Step 4: Debug Panel untuk Testing
```dart
// lib/widgets/api_debug_panel.dart
import 'package:flutter/material.dart';
import '../services/robust_approval_api_service.dart';

class ApiDebugPanel extends StatefulWidget {
  @override
  _ApiDebugPanelState createState() => _ApiDebugPanelState();
}

class _ApiDebugPanelState extends State<ApiDebugPanel> {
  final _apiService = RobustApprovalApiService();
  String _debugLog = '';
  bool _isLoading = false;

  void _addLog(String message) {
    setState(() {
      _debugLog += '${DateTime.now().toString().substring(11, 19)}: $message\n';
    });
  }

  Future<void> _testApprovalQueue() async {
    setState(() => _isLoading = true);
    _addLog('Testing Approval Queue...');
    
    try {
      final response = await _apiService.getApprovalQueue();
      _addLog('✅ Success: Found ${response['total']} tasks');
    } catch (e) {
      _addLog('❌ Error: $e');
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _testApproval() async {
    setState(() => _isLoading = true);
    _addLog('Testing Task Approval...');
    
    try {
      await _apiService.approveTask(1, 'Flutter debug test');
      _addLog('✅ Approval Success');
    } catch (e) {
      _addLog('❌ Approval Error: $e');
    }
    
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('API Debug Panel')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _testApprovalQueue,
                    child: Text('Test Queue'),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _testApproval,
                    child: Text('Test Approval'),
                  ),
                ),
                SizedBox(width: 8),
                IconButton(
                  onPressed: () => setState(() => _debugLog = ''),
                  icon: Icon(Icons.clear),
                ),
              ],
            ),
          ),
          if (_isLoading)
            LinearProgressIndicator(),
          Expanded(
            child: Container(
              margin: EdgeInsets.all(16),
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(8),
              ),
              child: SingleChildScrollView(
                child: Text(
                  _debugLog.isEmpty ? 'No logs yet...' : _debugLog,
                  style: TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

## 🚀 Final Checklist

Untuk mengatasi error 401 di Flutter:

1. ✅ **Test koneksi** dengan `ApiTest.testConnection()`
2. ✅ **Gunakan RobustApprovalApiService** dengan retry mechanism
3. ✅ **Tambahkan ApiDebugPanel** untuk testing real-time
4. ✅ **Cek session token** apakah masih valid
5. ✅ **Pastikan format header** benar
6. ✅ **Handle semua exception** dengan proper error messages

## 📱 Integration ke App

```dart
// Tambahkan ke main app
FloatingActionButton(
  onPressed: () {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => ApiDebugPanel()),
    );
  },
  child: Icon(Icons.bug_report),
)
```

Dengan setup ini, error 401 dari Flutter app seharusnya sudah teratasi! 🎉