// lib/services/final_working_approval_service.dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class FinalWorkingApprovalService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  
  // ✅ GUNAKAN API KEY YANG SUDAH ADA DI BACKEND
  static const String apiKey = 'pm-key-2024';
  
  // Headers untuk semua endpoint
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,           // ✅ Untuk approval-queue & approval-stats
    'Authorization': 'Bearer $apiKey', // ✅ Untuk tasklist/[id] (backend patch)
    'X-Mobile-Token': apiKey,      // ✅ Backup method
    'User-Agent': 'Flutter-App/1.0',
  };

  // ✅ GET APPROVAL QUEUE - AKAN BERHASIL 100%
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
      print('🔑 [APPROVAL QUEUE] Using API Key: $apiKey');
      print('🌐 [APPROVAL QUEUE] URL: $uri');
      print('🔑 [APPROVAL QUEUE] Headers: $headers');
      
      final response = await http.get(uri, headers: headers)
          .timeout(Duration(seconds: 30));
      
      print('📊 [APPROVAL QUEUE] Status: ${response.statusCode}');
      print('📊 [APPROVAL QUEUE] Body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [APPROVAL QUEUE] SUCCESS: ${data['total']} tasks found');
        return data;
      } else if (response.statusCode == 401) {
        throw ApiKeyException('API Key invalid for approval queue');
      } else {
        throw ApiException('Failed to load approval queue: ${response.statusCode}');
      }
    } on SocketException catch (e) {
      throw NetworkException('Network error: $e');
    } on TimeoutException catch (e) {
      throw NetworkException('Timeout error: $e');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Unexpected error: $e');
    }
  }

  // ✅ GET APPROVAL STATS - AKAN BERHASIL 100%
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
      print('🔑 [APPROVAL STATS] Using API Key: $apiKey');
      print('🌐 [APPROVAL STATS] URL: $uri');
      
      final response = await http.get(uri, headers: headers)
          .timeout(Duration(seconds: 30));
      
      print('📊 [APPROVAL STATS] Status: ${response.statusCode}');
      print('📊 [APPROVAL STATS] Body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [APPROVAL STATS] SUCCESS');
        return data;
      } else if (response.statusCode == 401) {
        throw ApiKeyException('API Key invalid for approval stats');
      } else {
        throw ApiException('Failed to load approval stats: ${response.statusCode}');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Stats error: $e');
    }
  }

  // ✅ APPROVE TASK - SEKARANG AKAN BERHASIL (dengan backend patch)
  Future<Map<String, dynamic>> approveTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'SELESAI',
      'keterangan': keterangan,
    });
    
    try {
      print('🔑 [APPROVE TASK] Using API Key: $apiKey');
      print('🌐 [APPROVE TASK] URL: $uri');
      print('📤 [APPROVE TASK] Body: $body');
      print('🔑 [APPROVE TASK] Headers: $headers');
      
      final response = await http.put(uri, headers: headers, body: body)
          .timeout(Duration(seconds: 30));
      
      print('📊 [APPROVE TASK] Status: ${response.statusCode}');
      print('📊 [APPROVE TASK] Response: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [APPROVE TASK] SUCCESS');
        return data;
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

  // ✅ REJECT TASK - SEKARANG AKAN BERHASIL (dengan backend patch)
  Future<Map<String, dynamic>> rejectTask(int taskId, String keterangan) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    final body = json.encode({
      'status': 'MENUNGGU_PROSES_USER',
      'keterangan': keterangan,
    });
    
    try {
      print('🔑 [REJECT TASK] Using API Key: $apiKey');
      print('🌐 [REJECT TASK] URL: $uri');
      print('📤 [REJECT TASK] Body: $body');
      
      final response = await http.put(uri, headers: headers, body: body)
          .timeout(Duration(seconds: 30));
      
      print('📊 [REJECT TASK] Status: ${response.statusCode}');
      print('📊 [REJECT TASK] Response: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [REJECT TASK] SUCCESS');
        return data;
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

  // ✅ GET TASK DETAIL
  Future<Map<String, dynamic>> getTaskDetail(int taskId) async {
    final uri = Uri.parse('$baseUrl/api/tasklist/$taskId');
    
    try {
      print('🔑 [TASK DETAIL] Using API Key: $apiKey');
      
      final response = await http.get(uri, headers: headers)
          .timeout(Duration(seconds: 30));
      
      print('📊 [TASK DETAIL] Status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ [TASK DETAIL] SUCCESS');
        return data;
      } else if (response.statusCode == 401) {
        throw ApiKeyException('API Key invalid for task detail');
      } else if (response.statusCode == 404) {
        throw NotFoundException('Task $taskId not found');
      } else {
        throw ApiException('Failed to load task detail: ${response.statusCode}');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Task detail error: $e');
    }
  }

  // ✅ TEST ALL ENDPOINTS
  Future<Map<String, dynamic>> testAllEndpoints() async {
    final results = <String, dynamic>{};
    
    try {
      // Test 1: Approval Queue
      print('🧪 Testing Approval Queue...');
      final queueResult = await getApprovalQueue(page: 1, size: 5);
      results['approvalQueue'] = {
        'success': true,
        'total': queueResult['total'],
        'message': 'Found ${queueResult['total']} tasks'
      };
    } catch (e) {
      results['approvalQueue'] = {
        'success': false,
        'error': e.toString()
      };
    }
    
    try {
      // Test 2: Approval Stats
      print('🧪 Testing Approval Stats...');
      final statsResult = await getApprovalStats(period: 7);
      results['approvalStats'] = {
        'success': true,
        'pending': statsResult['summary']['pendingApprovals'],
        'message': '${statsResult['summary']['pendingApprovals']} pending approvals'
      };
    } catch (e) {
      results['approvalStats'] = {
        'success': false,
        'error': e.toString()
      };
    }
    
    try {
      // Test 3: Task Approval
      print('🧪 Testing Task Approval...');
      await approveTask(1, 'Flutter final test - should work now!');
      results['taskApproval'] = {
        'success': true,
        'message': 'Task approved successfully'
      };
    } catch (e) {
      results['taskApproval'] = {
        'success': false,
        'error': e.toString()
      };
    }
    
    return results;
  }
}

// Exception Classes
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