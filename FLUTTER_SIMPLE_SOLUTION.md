# 🎯 Flutter Simple Solution - API Key yang Sudah Ada!

## ✅ **GOOD NEWS: API Key Sudah Tersedia!**

Saya menemukan bahwa endpoint approval-queue dan approval-stats **sudah mendukung API Key authentication** dengan keys yang sudah hardcoded di backend!

## 🔑 **Valid API Keys yang Tersedia:**

```typescript
// Dari backend code:
const VALID_API_KEYS = {
  'pm-key-2024': {
    id: 1,
    role: 'PM',
    namaLengkap: 'Mobile App User'
  },
  'admin-key-2024': {
    id: 2,
    role: 'ADMIN', 
    namaLengkap: 'Admin User'
  },
  'super-admin-key-2024': {
    id: 3,
    role: 'SUPER_ADMIN',
    namaLengkap: 'Super Admin User'
  }
};
```

## 🚀 **Flutter Implementation - Update API Service:**

```dart
// lib/services/working_approval_api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class WorkingApprovalApiService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  
  // ✅ GUNAKAN API KEY YANG SUDAH ADA
  static const String apiKey = 'pm-key-2024';        // Untuk PM role
  // static const String apiKey = 'admin-key-2024';     // Untuk ADMIN role  
  // static const String apiKey = 'super-admin-key-2024'; // Untuk SUPER_ADMIN role
  
  // Headers untuk approval-queue dan approval-stats (sudah support API Key)
  Map<String, String> get apiKeyHeaders => {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'User-Agent': 'Flutter-App/1.0',
  };
  
  // Headers untuk tasklist/[id] (perlu session token)
  Map<String, String> get sessionHeaders => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 172dc4710ab54af8b1b405c89d6de9f0',
    'X-API-Key': '172dc4710ab54af8b1b405c89d6de9f0',
    'User-Agent': 'Flutter-App/1.0',
  };

  // ✅ APPROVAL QUEUE - Menggunakan API Key (AKAN BERHASIL)
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

    final uri = Uri.parse('$baseUrl/api/tasklist/approval-queue')
        .replace(queryParameters: queryParams);
    
    try {
      print('🔑 [APPROVAL QUEUE] Using API Key: $apiKey');
      
      final response = await http.get(uri, headers: apiKeyHeaders)
          .timeout(Duration(seconds: 30));
      
      print('📊 [APPROVAL QUEUE] Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [APPROVAL QUEUE] Success: ${data['total']} tasks found');
        return data;
      } else {
        print('❌ [APPROVAL QUEUE] Failed: ${response.body}');
        throw Exception('Failed to load approval queue: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [APPROVAL QUEUE] Error: $e');
      rethrow;
    }
  }

  // ✅ APPROVAL STATS - Menggunakan API Key (AKAN BERHASIL)
  Future<Map<String, dynamic>> getApprovalStats({
    int? projectId,
    int period = 30,
  }) async {
    final queryParams = <String, String>{
      'period': period.toString(),
    };
    
    if (projectId != null) {
      queryParams['projectId'] = projectId.toString();
    }

    final uri = Uri.parse('$baseUrl/api/tasklist/approval-stats')
        .replace(queryParameters: queryParams);
    
    try {
      print('🔑 [APPROVAL STATS] Using API Key: $apiKey');
      
      final response = await http.get(uri, headers: apiKeyHeaders)
          .timeout(Duration(seconds: 30));
      
      print('📊 [APPROVAL STATS] Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [APPROVAL STATS] Success');
        return data;
      } else {
        print('❌ [APPROVAL STATS] Failed: ${response.body}');
        throw Exception('Failed to load approval stats: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [APPROVAL STATS] Error: $e');
      rethrow;
    }
  }

  // ⚠️ TASK APPROVAL - Masih perlu session token yang valid
  Future<Map<String, dynamic>> approveTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'SELESAI',
      'keterangan': keterangan,
    });
    
    try {
      print('🔑 [APPROVE TASK] Trying with enhanced headers...');
      
      // Try dengan headers yang sudah diupdate di backend
      final response = await http.put(uri, headers: sessionHeaders, body: body)
          .timeout(Duration(seconds: 30));
      
      print('📊 [APPROVE TASK] Response: ${response.statusCode}');
      print('📊 [APPROVE TASK] Body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [APPROVE TASK] Success');
        return data;
      } else {
        print('❌ [APPROVE TASK] Failed: ${response.body}');
        throw Exception('Failed to approve task: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [APPROVE TASK] Error: $e');
      rethrow;
    }
  }

  // ⚠️ TASK REJECTION - Masih perlu session token yang valid  
  Future<Map<String, dynamic>> rejectTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'MENUNGGU_PROSES_USER',
      'keterangan': keterangan,
    });
    
    try {
      print('🔑 [REJECT TASK] Trying with enhanced headers...');
      
      final response = await http.put(uri, headers: sessionHeaders, body: body)
          .timeout(Duration(seconds: 30));
      
      print('📊 [REJECT TASK] Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [REJECT TASK] Success');
        return data;
      } else {
        print('❌ [REJECT TASK] Failed: ${response.body}');
        throw Exception('Failed to reject task: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [REJECT TASK] Error: $e');
      rethrow;
    }
  }
}
```

## 🧪 **Test Widget - Update dengan API Key yang Benar:**

```dart
// lib/widgets/working_api_test_widget.dart
import 'package:flutter/material.dart';
import '../services/working_approval_api_service.dart';

class WorkingApiTestWidget extends StatefulWidget {
  @override
  _WorkingApiTestWidgetState createState() => _WorkingApiTestWidgetState();
}

class _WorkingApiTestWidgetState extends State<WorkingApiTestWidget> {
  final WorkingApprovalApiService _apiService = WorkingApprovalApiService();
  String _testResults = '';
  bool _isLoading = false;

  void _addResult(String message) {
    setState(() {
      _testResults += '${DateTime.now().toString().substring(11, 19)}: $message\n';
    });
  }

  Future<void> _testApprovalQueue() async {
    setState(() => _isLoading = true);
    _addResult('🔑 Testing Approval Queue with API Key...');
    
    try {
      final response = await _apiService.getApprovalQueue(page: 1, size: 5);
      _addResult('✅ SUCCESS: Found ${response['total']} tasks');
      _addResult('📊 Summary: ${response['summary']['totalPending']} pending');
    } catch (e) {
      _addResult('❌ FAILED: $e');
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _testApprovalStats() async {
    setState(() => _isLoading = true);
    _addResult('📊 Testing Approval Stats with API Key...');
    
    try {
      final response = await _apiService.getApprovalStats(period: 7);
      _addResult('✅ SUCCESS: ${response['summary']['pendingApprovals']} pending');
      _addResult('📈 Approved: ${response['summary']['approvedTasks']}');
    } catch (e) {
      _addResult('❌ FAILED: $e');
    }
    
    setState(() => _isLoading = false);
  }

  Future<void> _testTaskApproval() async {
    setState(() => _isLoading = true);
    _addResult('✅ Testing Task Approval...');
    
    try {
      await _apiService.approveTask(1, 'Flutter test with working API');
      _addResult('✅ SUCCESS: Task approved');
    } catch (e) {
      _addResult('❌ FAILED: $e');
    }
    
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Working API Test'),
        backgroundColor: Colors.green,
      ),
      body: Column(
        children: [
          // Info Card
          Container(
            margin: EdgeInsets.all(16),
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green[50],
              border: Border.all(color: Colors.green),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '🔑 Using Valid API Key: pm-key-2024',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text('✅ Approval Queue & Stats: Should work'),
                Text('⚠️ Task Approval: May need session token'),
              ],
            ),
          ),
          
          // Test Buttons
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _testApprovalQueue,
                        icon: Icon(Icons.list),
                        label: Text('Test Queue'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                        ),
                      ),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _testApprovalStats,
                        icon: Icon(Icons.analytics),
                        label: Text('Test Stats'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _testTaskApproval,
                    icon: Icon(Icons.check),
                    label: Text('Test Approval (May Fail)'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Loading
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
                  _testResults.isEmpty 
                    ? 'Ready to test!\n\n✅ Queue & Stats should work with API Key\n⚠️ Approval may need valid session token' 
                    : _testResults,
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

## 🎯 **Expected Results:**

### ✅ **AKAN BERHASIL:**
- `getApprovalQueue()` - Menggunakan API Key `pm-key-2024`
- `getApprovalStats()` - Menggunakan API Key `pm-key-2024`

### ⚠️ **MUNGKIN MASIH GAGAL:**
- `approveTask()` - Perlu session token yang valid (sudah dipatch backend)
- `rejectTask()` - Perlu session token yang valid (sudah dipatch backend)

## 🚀 **Implementation Steps:**

1. **Copy** `WorkingApprovalApiService` ke Flutter project
2. **Copy** `WorkingApiTestWidget` ke Flutter project  
3. **Test** approval queue dan stats (should work!)
4. **Test** task approval (may still fail until session token fixed)

## 🔑 **API Key Options:**

- `pm-key-2024` - PM role (recommended untuk approval)
- `admin-key-2024` - ADMIN role (full access)
- `super-admin-key-2024` - SUPER_ADMIN role (full access)

**Dengan API Key yang sudah ada ini, minimal approval queue dan stats akan berhasil!** 🎉