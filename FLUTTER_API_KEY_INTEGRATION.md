# Flutter Integration dengan API Key - Tasklist Approval API

## 🔑 Solusi: Menggunakan API Key Authentication

Karena session token `172dc4710ab54af8b1b405c89d6de9f0` sudah expired (response: `{"user":null}`), mari kita implementasikan authentication menggunakan API Key untuk Flutter app.

## � Settup API Key Authentication

### 1. Flutter HTTP Client dengan API Key
```dart
// lib/services/api_key_approval_service.dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiKeyApprovalService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  static const String apiKey = 'your-api-key-here'; // Akan diupdate dengan key yang valid
  
  // Headers dengan API Key
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $apiKey',
    'X-API-Key': apiKey,
    'User-Agent': 'Flutter-App/1.0',
  };

  // Alternative headers jika menggunakan custom header
  Map<String, String> get headersCustom => {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-Client-Type': 'mobile',
    'User-Agent': 'Flutter-App/1.0',
  };

  // Get Approval Queue dengan API Key
  Future<Map<String, dynamic>> getApprovalQueue({
    int? projectId,
    int? moduleId,
    int? pegawaiId,
    int page = 1,
    int size = 10,
    String sortKey = 'scheduleAt',
    String sortDir = 'asc',
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
      'sortKey': sortKey,
      'sortDir': sortDir,
    };
    
    if (projectId != null) queryParams['projectId'] = projectId.toString();
    if (moduleId != null) queryParams['moduleId'] = moduleId.toString();
    if (pegawaiId != null) queryParams['pegawaiId'] = pegawaiId.toString();
    
    final uri = Uri.parse('$baseUrl/api/tasklist/approval-queue')
        .replace(queryParameters: queryParams);
    
    try {
      print('🔑 Making request with API Key to: $uri');
      print('🔑 Headers: $headers');
      
      final response = await http.get(uri, headers: headers)
          .timeout(Duration(seconds: 30));
      
      print('📊 Response Status: ${response.statusCode}');
      print('📊 Response Body: ${response.body}');
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw ApiKeyException('API Key invalid or expired');
      } else if (response.statusCode == 403) {
        throw PermissionException('Access denied with current API Key');
      } else {
        throw ApiException('Failed to load approval queue: ${response.statusCode}');
      }
    } on SocketException catch (e) {
      throw NetworkException('Network connection failed: $e');
    } on TimeoutException catch (e) {
      throw NetworkException('Request timeout: $e');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Unexpected error: $e');
    }
  }

  // Get Approval Statistics dengan API Key
  Future<Map<String, dynamic>> getApprovalStats({
    int? projectId,
    int period = 30,
  }) async {
    final queryParams = <String, String>{
      'period': period.toString(),
    };
    
    if (projectId != null) queryParams['projectId'] = projectId.toString();
    
    final uri = Uri.parse('$baseUrl/api/tasklist/approval-stats')
        .replace(queryParameters: queryParams);
    
    try {
      print('🔑 Getting approval stats with API Key');
      
      final response = await http.get(uri, headers: headers)
          .timeout(Duration(seconds: 30));
      
      print('📊 Stats Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw ApiKeyException('API Key invalid for stats endpoint');
      } else {
        throw ApiException('Failed to load approval stats: ${response.statusCode}');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Stats error: $e');
    }
  }

  // Approve Task dengan API Key
  Future<Map<String, dynamic>> approveTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'SELESAI',
      'keterangan': keterangan,
    });
    
    try {
      print('🔑 Approving task $taskId with API Key');
      print('🔑 Request body: $body');
      
      final response = await http.put(uri, headers: headers, body: body)
          .timeout(Duration(seconds: 30));
      
      print('📊 Approve Response: ${response.statusCode}');
      print('📊 Approve Body: ${response.body}');
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw ApiKeyException('API Key invalid for task approval');
      } else if (response.statusCode == 403) {
        throw PermissionException('No permission to approve this task');
      } else if (response.statusCode == 404) {
        throw NotFoundException('Task $taskId not found');
      } else {
        final errorBody = response.body.isNotEmpty ? 
            json.decode(response.body) : {'error': 'Unknown error'};
        throw ApiException(errorBody['error'] ?? 'Failed to approve task');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Approval error: $e');
    }
  }

  // Reject Task dengan API Key
  Future<Map<String, dynamic>> rejectTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'MENUNGGU_PROSES_USER',
      'keterangan': keterangan,
    });
    
    try {
      print('🔑 Rejecting task $taskId with API Key');
      
      final response = await http.put(uri, headers: headers, body: body)
          .timeout(Duration(seconds: 30));
      
      print('📊 Reject Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw ApiKeyException('API Key invalid for task rejection');
      } else if (response.statusCode == 403) {
        throw PermissionException('No permission to reject this task');
      } else {
        final errorBody = response.body.isNotEmpty ? 
            json.decode(response.body) : {'error': 'Unknown error'};
        throw ApiException(errorBody['error'] ?? 'Failed to reject task');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Rejection error: $e');
    }
  }

  // Test API Key Validity
  Future<Map<String, dynamic>> testApiKey() async {
    try {
      print('🔑 Testing API Key validity...');
      
      // Test dengan endpoint yang ringan
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/me'),
        headers: headers,
      ).timeout(Duration(seconds: 10));
      
      print('📊 API Key Test Response: ${response.statusCode}');
      print('📊 API Key Test Body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'valid': true,
          'user': data['user'],
          'message': 'API Key is valid'
        };
      } else if (response.statusCode == 401) {
        return {
          'valid': false,
          'message': 'API Key is invalid or expired'
        };
      } else {
        return {
          'valid': false,
          'message': 'API Key test failed with status ${response.statusCode}'
        };
      }
    } catch (e) {
      return {
        'valid': false,
        'message': 'API Key test error: $e'
      };
    }
  }
}

// Custom Exception Classes
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  
  ApiException(this.message, [this.statusCode]);
  
  @override
  String toString() => message;
}

class ApiKeyException extends ApiException {
  ApiKeyException(String message) : super(message, 401);
}

class PermissionException extends ApiException {
  PermissionException(String message) : super(message, 403);
}

class NotFoundException extends ApiException {
  NotFoundException(String message) : super(message, 404);
}

class NetworkException extends ApiException {
  NetworkException(String message) : super(message);
}
```

## 🧪 Test Widget untuk API Key

### 2. API Key Test Widget
```dart
// lib/widgets/api_key_test_widget.dart
import 'package:flutter/material.dart';
import '../services/api_key_approval_service.dart';

class ApiKeyTestWidget extends StatefulWidget {
  @override
  _ApiKeyTestWidgetState createState() => _ApiKeyTestWidgetState();
}

class _ApiKeyTestWidgetState extends State<ApiKeyTestWidget> {
  final ApiKeyApprovalService _apiService = ApiKeyApprovalService();
  String _testResults = '';
  bool _isLoading = false;

  void _addResult(String message) {
    setState(() {
      _testResults += '${DateTime.now().toString().substring(11, 19)}: $message\n';
    });
  }

  Future<void> _testApiKey() async {
    setState(() => _isLoading = true);
    _addResult('🔑 Testing API Key...');
    
    try {
      final result = await _apiService.testApiKey();
      if (result['valid']) {
        _addResult('✅ API Key is valid');
        if (result['user'] != null) {
          _addResult('👤 User: ${result['user']['namaLengkap']} (${result['user']['role']})');
        }
      } else {
        _addResult('❌ ${result['message']}');
      }
    } catch (e) {
      _addResult('❌ API Key test failed: $e');
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _testApprovalQueue() async {
    setState(() => _isLoading = true);
    _addResult('📋 Testing Approval Queue...');
    
    try {
      final response = await _apiService.getApprovalQueue(page: 1, size: 5);
      _addResult('✅ Approval Queue: ${response['total']} tasks found');
      _addResult('📊 Summary: ${response['summary']['totalPending']} pending, ${response['summary']['overdueCount']} overdue');
    } catch (e) {
      _addResult('❌ Approval Queue failed: $e');
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _testApprovalStats() async {
    setState(() => _isLoading = true);
    _addResult('📊 Testing Approval Stats...');
    
    try {
      final response = await _apiService.getApprovalStats(period: 7);
      _addResult('✅ Stats: ${response['summary']['pendingApprovals']} pending');
      _addResult('📈 Approved: ${response['summary']['approvedTasks']}, Rejected: ${response['summary']['rejectedTasks']}');
    } catch (e) {
      _addResult('❌ Approval Stats failed: $e');
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _testTaskApproval() async {
    setState(() => _isLoading = true);
    _addResult('✅ Testing Task Approval...');
    
    try {
      await _apiService.approveTask(1, 'Flutter API Key test approval');
      _addResult('✅ Task approval successful');
    } catch (e) {
      _addResult('❌ Task approval failed: $e');
    }
    
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('API Key Test'),
        actions: [
          IconButton(
            icon: Icon(Icons.clear),
            onPressed: () => setState(() => _testResults = ''),
          ),
        ],
      ),
      body: Column(
        children: [
          // Test Buttons
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _testApiKey,
                        icon: Icon(Icons.vpn_key),
                        label: Text('Test API Key'),
                      ),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _testApprovalQueue,
                        icon: Icon(Icons.list),
                        label: Text('Test Queue'),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _testApprovalStats,
                        icon: Icon(Icons.analytics),
                        label: Text('Test Stats'),
                      ),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _testTaskApproval,
                        icon: Icon(Icons.check),
                        label: Text('Test Approval'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Loading Indicator
          if (_isLoading)
            LinearProgressIndicator(),
          
          // Results
          Expanded(
            child: Container(
              margin: EdgeInsets.all(16),
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(8),
                color: Colors.grey[50],
              ),
              child: SingleChildScrollView(
                child: Text(
                  _testResults.isEmpty ? 'No test results yet...\n\nTap buttons above to test API Key functionality.' : _testResults,
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
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

## 🔧 Implementasi di Main App

### 3. Integration ke Main App
```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'widgets/api_key_test_widget.dart';
import 'screens/approval_queue_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tasklist Approval',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MainScreen(),
    );
  }
}

class MainScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Tasklist Approval'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => ApiKeyTestWidget()),
                );
              },
              icon: Icon(Icons.bug_report),
              label: Text('Test API Key'),
            ),
            SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => ApprovalQueueScreen()),
                );
              },
              icon: Icon(Icons.approval),
              label: Text('Approval Queue'),
            ),
          ],
        ),
      ),
    );
  }
}
```

## 🔑 Cara Mendapatkan API Key

### Opsi 1: Dari Backend Developer
Minta backend developer untuk generate API Key khusus untuk mobile app dengan permission:
- `tasklist:read`
- `tasklist:approve`
- `tasklist:reject`
- `tasklist:stats`

### Opsi 2: Temporary Workaround
Jika belum ada sistem API Key, bisa menggunakan:
```dart
// Temporary solution - hardcode user credentials
static const String apiKey = 'mobile-app-key-v1';
// Atau gunakan basic auth
static const String basicAuth = 'Basic ' + base64.encode('username:password');
```

### Opsi 3: Login Programmatically
```dart
// Login untuk mendapatkan session token baru
Future<String> getValidSessionToken() async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: json.encode({
      'username': 'pm_user',
      'password': 'your_password',
    }),
  );
  
  if (response.statusCode == 200) {
    // Extract session token from Set-Cookie header
    final cookies = response.headers['set-cookie'];
    // Parse session token...
    return extractedSessionToken;
  }
  
  throw Exception('Login failed');
}
```

## 🚀 Next Steps

1. **Update API Key** di `ApiKeyApprovalService`
2. **Test dengan widget** `ApiKeyTestWidget`
3. **Implementasi approval queue** screen
4. **Handle error cases** dengan proper UI feedback
5. **Add loading states** dan retry mechanisms

## 📱 Quick Test

```dart
// Test langsung di Flutter
final apiService = ApiKeyApprovalService();

// Test API Key
final testResult = await apiService.testApiKey();
print('API Key valid: ${testResult['valid']}');

// Test approval queue
try {
  final queue = await apiService.getApprovalQueue();
  print('Found ${queue['total']} tasks');
} catch (e) {
  print('Error: $e');
}
```

Dengan implementasi ini, Flutter app Anda seharusnya bisa mengakses API approval tanpa error 401! 🎉

**Update API Key di line 8 file `ApiKeyApprovalService` dengan key yang valid dari backend developer.**