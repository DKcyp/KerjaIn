# Flutter Integration - Tasklist Approval API

## 🎯 Khusus untuk Flutter Mobile App

API approval tasklist sudah siap untuk diintegrasikan dengan Flutter app Anda.

## 📱 Flutter HTTP Client Setup

### 1. Dependencies
```yaml
# pubspec.yaml
dependencies:
  http: ^1.1.0
  shared_preferences: ^2.2.2
```

### 2. API Service Class
```dart
// lib/services/approval_api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApprovalApiService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  static const String apiKey = 'mobile-app-key-2024'; // Hardcoded API Key
  
  // Headers dengan API Key
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
  };

  // Get Approval Queue
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
      final response = await http.get(uri, headers: headers);
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Authentication failed - please login again');
      } else {
        throw Exception('Failed to load approval queue: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Get Approval Statistics
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
      final response = await http.get(uri, headers: headers);
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Authentication failed - please login again');
      } else {
        throw Exception('Failed to load approval stats: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Approve Task
  Future<Map<String, dynamic>> approveTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'SELESAI',
      'keterangan': keterangan,
    });
    
    try {
      final response = await http.put(uri, headers: headers, body: body);
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Authentication failed - please login again');
      } else if (response.statusCode == 403) {
        throw Exception('You don\'t have permission to approve this task');
      } else if (response.statusCode == 404) {
        throw Exception('Task not found');
      } else {
        final errorBody = json.decode(response.body);
        throw Exception(errorBody['error'] ?? 'Failed to approve task');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Network error: $e');
    }
  }

  // Reject Task
  Future<Map<String, dynamic>> rejectTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'MENUNGGU_PROSES_USER',
      'keterangan': keterangan,
    });
    
    try {
      final response = await http.put(uri, headers: headers, body: body);
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Authentication failed - please login again');
      } else if (response.statusCode == 403) {
        throw Exception('You don\'t have permission to reject this task');
      } else if (response.statusCode == 404) {
        throw Exception('Task not found');
      } else {
        final errorBody = json.decode(response.body);
        throw Exception(errorBody['error'] ?? 'Failed to reject task');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Network error: $e');
    }
  }

  // Get Task Detail
  Future<Map<String, dynamic>> getTaskDetail(int taskId) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    try {
      final response = await http.get(uri, headers: headers);
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Authentication failed - please login again');
      } else if (response.statusCode == 404) {
        throw Exception('Task not found');
      } else {
        throw Exception('Failed to load task detail: ${response.statusCode}');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Network error: $e');
    }
  }
}
```

## 📊 Data Models

### 3. Task Model
```dart
// lib/models/task_model.dart
class TaskModel {
  final int id;
  final String kode;
  final int projectId;
  final int moduleId;
  final int pegawaiId;
  final int? createdBy;
  final String status;
  final int statusCode;
  final String statusText;
  final String proyekNama;
  final String moduleNama;
  final String pegawaiNama;
  final String? creatorNama;
  final DateTime scheduleAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? keterangan;
  final String taskComplexity;
  final int? estimatedHours;
  final String tasklistType;
  final List<String> availableActions;
  final int waitingDays;
  final bool isOverdue;

  TaskModel({
    required this.id,
    required this.kode,
    required this.projectId,
    required this.moduleId,
    required this.pegawaiId,
    this.createdBy,
    required this.status,
    required this.statusCode,
    required this.statusText,
    required this.proyekNama,
    required this.moduleNama,
    required this.pegawaiNama,
    this.creatorNama,
    required this.scheduleAt,
    required this.createdAt,
    required this.updatedAt,
    this.keterangan,
    required this.taskComplexity,
    this.estimatedHours,
    required this.tasklistType,
    required this.availableActions,
    required this.waitingDays,
    required this.isOverdue,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'],
      kode: json['kode'],
      projectId: json['projectId'],
      moduleId: json['moduleId'],
      pegawaiId: json['pegawaiId'],
      createdBy: json['createdBy'],
      status: json['status'],
      statusCode: json['statusCode'],
      statusText: json['statusText'],
      proyekNama: json['proyekNama'],
      moduleNama: json['moduleNama'],
      pegawaiNama: json['pegawaiNama'],
      creatorNama: json['creatorNama'],
      scheduleAt: DateTime.parse(json['scheduleAt']),
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      keterangan: json['keterangan'],
      taskComplexity: json['taskComplexity'],
      estimatedHours: json['estimatedHours'],
      tasklistType: json['tasklistType'],
      availableActions: List<String>.from(json['availableActions']),
      waitingDays: json['waitingDays'],
      isOverdue: json['isOverdue'],
    );
  }
}
```

### 4. Approval Stats Model
```dart
// lib/models/approval_stats_model.dart
class ApprovalStatsModel {
  final ApprovalSummary summary;
  final List<StatusBreakdown> statusBreakdown;
  final List<TopAssignee> topAssignees;
  final List<DailyTrend> dailyTrend;
  final DateTime generatedAt;
  final int userId;
  final String userRole;

  ApprovalStatsModel({
    required this.summary,
    required this.statusBreakdown,
    required this.topAssignees,
    required this.dailyTrend,
    required this.generatedAt,
    required this.userId,
    required this.userRole,
  });

  factory ApprovalStatsModel.fromJson(Map<String, dynamic> json) {
    return ApprovalStatsModel(
      summary: ApprovalSummary.fromJson(json['summary']),
      statusBreakdown: (json['statusBreakdown'] as List)
          .map((item) => StatusBreakdown.fromJson(item))
          .toList(),
      topAssignees: (json['topAssignees'] as List)
          .map((item) => TopAssignee.fromJson(item))
          .toList(),
      dailyTrend: (json['dailyTrend'] as List)
          .map((item) => DailyTrend.fromJson(item))
          .toList(),
      generatedAt: DateTime.parse(json['generatedAt']),
      userId: json['userId'],
      userRole: json['userRole'],
    );
  }
}

class ApprovalSummary {
  final int pendingApprovals;
  final int overdueApprovals;
  final int approvedTasks;
  final int rejectedTasks;
  final double? avgApprovalTimeHours;
  final String period;

  ApprovalSummary({
    required this.pendingApprovals,
    required this.overdueApprovals,
    required this.approvedTasks,
    required this.rejectedTasks,
    this.avgApprovalTimeHours,
    required this.period,
  });

  factory ApprovalSummary.fromJson(Map<String, dynamic> json) {
    return ApprovalSummary(
      pendingApprovals: json['pendingApprovals'],
      overdueApprovals: json['overdueApprovals'],
      approvedTasks: json['approvedTasks'],
      rejectedTasks: json['rejectedTasks'],
      avgApprovalTimeHours: json['avgApprovalTimeHours']?.toDouble(),
      period: json['period'],
    );
  }
}

class StatusBreakdown {
  final String status;
  final int count;
  final int percentage;

  StatusBreakdown({
    required this.status,
    required this.count,
    required this.percentage,
  });

  factory StatusBreakdown.fromJson(Map<String, dynamic> json) {
    return StatusBreakdown(
      status: json['status'],
      count: json['count'],
      percentage: json['percentage'],
    );
  }
}

class TopAssignee {
  final int pegawaiId;
  final String pegawaiNama;
  final int pendingCount;

  TopAssignee({
    required this.pegawaiId,
    required this.pegawaiNama,
    required this.pendingCount,
  });

  factory TopAssignee.fromJson(Map<String, dynamic> json) {
    return TopAssignee(
      pegawaiId: json['pegawaiId'],
      pegawaiNama: json['pegawaiNama'],
      pendingCount: json['pendingCount'],
    );
  }
}

class DailyTrend {
  final String date;
  final int count;

  DailyTrend({
    required this.date,
    required this.count,
  });

  factory DailyTrend.fromJson(Map<String, dynamic> json) {
    return DailyTrend(
      date: json['date'],
      count: json['count'],
    );
  }
}
```

## 🎨 UI Implementation Examples

### 5. Approval Queue Screen
```dart
// lib/screens/approval_queue_screen.dart
import 'package:flutter/material.dart';
import '../services/approval_api_service.dart';
import '../models/task_model.dart';

class ApprovalQueueScreen extends StatefulWidget {
  @override
  _ApprovalQueueScreenState createState() => _ApprovalQueueScreenState();
}

class _ApprovalQueueScreenState extends State<ApprovalQueueScreen> {
  final ApprovalApiService _apiService = ApprovalApiService();
  List<TaskModel> _tasks = [];
  bool _isLoading = true;
  String? _error;
  int _totalPending = 0;
  int _overdueCount = 0;

  @override
  void initState() {
    super.initState();
    _loadApprovalQueue();
  }

  Future<void> _loadApprovalQueue() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _apiService.getApprovalQueue(
        page: 1,
        size: 50,
        sortKey: 'scheduleAt',
        sortDir: 'asc',
      );

      final tasks = (response['items'] as List)
          .map((item) => TaskModel.fromJson(item))
          .toList();

      setState(() {
        _tasks = tasks;
        _totalPending = response['summary']['totalPending'];
        _overdueCount = response['summary']['overdueCount'];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _approveTask(TaskModel task) async {
    final keterangan = await _showApprovalDialog(task, true);
    if (keterangan == null) return;

    try {
      await _apiService.approveTask(task.id, keterangan);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Task ${task.kode} approved successfully'),
          backgroundColor: Colors.green,
        ),
      );
      _loadApprovalQueue(); // Refresh list
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to approve task: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _rejectTask(TaskModel task) async {
    final keterangan = await _showApprovalDialog(task, false);
    if (keterangan == null) return;

    try {
      await _apiService.rejectTask(task.id, keterangan);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Task ${task.kode} rejected'),
          backgroundColor: Colors.orange,
        ),
      );
      _loadApprovalQueue(); // Refresh list
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to reject task: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<String?> _showApprovalDialog(TaskModel task, bool isApproval) async {
    final controller = TextEditingController();
    
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isApproval ? 'Approve Task' : 'Reject Task'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Task: ${task.kode}'),
            Text('Assignee: ${task.pegawaiNama}'),
            SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                labelText: isApproval ? 'Approval Notes' : 'Rejection Reason',
                hintText: isApproval 
                    ? 'Great work! Ready for deployment.'
                    : 'Please fix the following issues...',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            style: ElevatedButton.styleFrom(
              backgroundColor: isApproval ? Colors.green : Colors.orange,
            ),
            child: Text(isApproval ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Approval Queue'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadApprovalQueue,
          ),
        ],
      ),
      body: Column(
        children: [
          // Summary Cards
          Container(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Text(
                            '$_totalPending',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          Text('Pending'),
                        ],
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Card(
                    color: _overdueCount > 0 ? Colors.red[50] : null,
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Text(
                            '$_overdueCount',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: _overdueCount > 0 ? Colors.red : null,
                            ),
                          ),
                          Text('Overdue'),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Task List
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error, size: 64, color: Colors.red),
                            SizedBox(height: 16),
                            Text(_error!),
                            SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadApprovalQueue,
                              child: Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _tasks.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle, size: 64, color: Colors.green),
                                SizedBox(height: 16),
                                Text('No tasks pending approval'),
                                Text('Great job! 🎉'),
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: _tasks.length,
                            itemBuilder: (context, index) {
                              final task = _tasks[index];
                              return Card(
                                margin: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                child: ListTile(
                                  title: Text(task.kode),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('${task.pegawaiNama} • ${task.proyekNama}'),
                                      Text('Module: ${task.moduleNama}'),
                                      if (task.isOverdue)
                                        Text(
                                          'OVERDUE',
                                          style: TextStyle(
                                            color: Colors.red,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      Text('Waiting: ${task.waitingDays} days'),
                                    ],
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: Icon(Icons.check, color: Colors.green),
                                        onPressed: () => _approveTask(task),
                                      ),
                                      IconButton(
                                        icon: Icon(Icons.close, color: Colors.red),
                                        onPressed: () => _rejectTask(task),
                                      ),
                                    ],
                                  ),
                                  onTap: () {
                                    // Navigate to task detail
                                  },
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
```

## 🔧 Error Handling untuk Flutter

### 6. Custom Exception Handler
```dart
// lib/utils/api_exception.dart
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  
  ApiException(this.message, [this.statusCode]);
  
  @override
  String toString() => message;
}

class AuthenticationException extends ApiException {
  AuthenticationException() : super('Authentication failed - please login again', 401);
}

class PermissionException extends ApiException {
  PermissionException(String message) : super(message, 403);
}

class NotFoundException extends ApiException {
  NotFoundException(String message) : super(message, 404);
}
```

## 🚀 Usage Examples

### 7. Simple Usage
```dart
// In your widget
final apiService = ApprovalApiService();

// Get approval queue
try {
  final response = await apiService.getApprovalQueue();
  final tasks = (response['items'] as List)
      .map((item) => TaskModel.fromJson(item))
      .toList();
  // Use tasks...
} catch (e) {
  // Handle error...
}

// Approve task
try {
  await apiService.approveTask(123, 'Great work!');
  // Success...
} catch (e) {
  // Handle error...
}
```

## 🔐 Authentication Notes

**Current Setup:**
- Session token: `172dc4710ab54af8b1b405c89d6de9f0` (hardcoded)
- Sent via Cookie header: `Cookie: session=172dc4710ab54af8b1b405c89d6de9f0`

**For Production:**
- Store session token securely using `shared_preferences` or `flutter_secure_storage`
- Implement token refresh mechanism
- Handle 401 errors by redirecting to login

## 📱 Testing dari Flutter

Jika masih ada error 401, coba:

1. **Cek network connectivity**
2. **Pastikan base URL benar** (`http://192.168.1.10:3000`)
3. **Test dengan Postman dulu** untuk memastikan API bekerja
4. **Cek session token** apakah masih valid
5. **Gunakan debug mode** untuk melihat HTTP headers

API sudah siap untuk Flutter integration! 🚀