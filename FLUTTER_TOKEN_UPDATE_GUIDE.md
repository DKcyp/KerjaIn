# Flutter Token Update Guide

## 🚨 **Problem Identified: Token Expired**

Token `172dc4710ab54af8b1b405c89d6de9f0` sudah **expired/invalid**.

Response dari server: `{"user":null}` - menunjukkan tidak ada user yang terautentikasi.

## 🔧 **Solusi: Update Token di Flutter**

### Step 1: Dapatkan Token Baru dari Browser

1. **Buka browser** dan login ke `http://192.168.1.10:3000`
2. **Login** dengan akun PM/Admin yang valid
3. **Buka Developer Tools** (F12)
4. **Pergi ke Application > Cookies > http://192.168.1.10:3000**
5. **Copy nilai session cookie** yang baru

### Step 2: Update Flutter Code

```dart
// lib/services/approval_api_service.dart
class ApprovalApiService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  
  // 🔄 UPDATE TOKEN INI DENGAN TOKEN BARU DARI BROWSER
  static const String sessionToken = 'TOKEN_BARU_DARI_BROWSER';
  
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Cookie': 'session=$sessionToken',
    'User-Agent': 'Flutter-App/1.0',
  };

  // Test authentication first
  Future<bool> testAuth() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/me'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['user'] != null) {
          print('✅ Auth OK - User: ${data['user']['namaLengkap']} (${data['user']['role']})');
          return true;
        }
      }
      
      print('❌ Auth failed - Token expired or invalid');
      return false;
    } catch (e) {
      print('❌ Auth error: $e');
      return false;
    }
  }

  // Rest of your API methods...
}
```

### Step 3: Test Authentication Sebelum API Call

```dart
// Sebelum memanggil API approval, test auth dulu
final apiService = ApprovalApiService();

// Test authentication
bool isAuthenticated = await apiService.testAuth();
if (!isAuthenticated) {
  // Show error: "Session expired, please login again"
  return;
}

// Baru panggil API approval
try {
  final response = await apiService.getApprovalQueue();
  // Success...
} catch (e) {
  // Handle error...
}
```

### Step 4: Automatic Token Validation

```dart
// lib/services/auth_service.dart
class AuthService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  static String? _sessionToken;
  
  // Set token dari login atau dari storage
  static void setSessionToken(String token) {
    _sessionToken = token;
  }
  
  static String? get sessionToken => _sessionToken;
  
  // Validate token
  static Future<bool> validateToken() async {
    if (_sessionToken == null) return false;
    
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/me'),
        headers: {'Cookie': 'session=$_sessionToken'},
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['user'] != null;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }
  
  // Get user info
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    if (!await validateToken()) return null;
    
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/me'),
        headers: {'Cookie': 'session=$_sessionToken'},
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['user'];
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }
}
```

### Step 5: Updated API Service dengan Auto Token Check

```dart
// lib/services/secure_approval_api_service.dart
class SecureApprovalApiService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Cookie': 'session=${AuthService.sessionToken}',
    'User-Agent': 'Flutter-App/1.0',
  };

  // Wrapper untuk semua API calls dengan auto token validation
  Future<Map<String, dynamic>> _secureApiCall(
    Future<http.Response> Function() apiCall,
  ) async {
    // Check token validity first
    if (!await AuthService.validateToken()) {
      throw AuthenticationException('Session expired. Please login again.');
    }
    
    try {
      final response = await apiCall();
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw AuthenticationException('Session expired. Please login again.');
      } else if (response.statusCode == 403) {
        throw PermissionException('Access denied');
      } else {
        throw ApiException('HTTP ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getApprovalQueue() async {
    return await _secureApiCall(() => http.get(
      Uri.parse('$baseUrl/api/tasklist/approval-queue'),
      headers: headers,
    ));
  }

  Future<Map<String, dynamic>> approveTask(int taskId, String keterangan) async {
    return await _secureApiCall(() => http.put(
      Uri.parse('$baseUrl/api/tasklist/$taskId'),
      headers: headers,
      body: json.encode({
        'status': 'SELESAI',
        'keterangan': keterangan,
      }),
    ));
  }
}
```

## 🧪 **Test dengan Token Baru**

Setelah update token:

```dart
// Test di main app
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set token baru
  AuthService.setSessionToken('TOKEN_BARU_DARI_BROWSER');
  
  // Test authentication
  bool isAuth = await AuthService.validateToken();
  print('Authentication status: $isAuth');
  
  if (isAuth) {
    final user = await AuthService.getCurrentUser();
    print('Logged in as: ${user?['namaLengkap']} (${user?['role']})');
  }
  
  runApp(MyApp());
}
```

## 📝 **Checklist**

1. ✅ **Dapatkan token baru** dari browser setelah login
2. ✅ **Update sessionToken** di Flutter code
3. ✅ **Test authentication** dengan `AuthService.validateToken()`
4. ✅ **Implementasi auto token check** sebelum API calls
5. ✅ **Handle 401 errors** dengan redirect ke login

## 🎯 **Expected Result**

Setelah update token baru:
- ✅ `GET /api/auth/me` → Status 200 dengan user data
- ✅ `GET /api/tasklist/approval-queue` → Status 200 dengan task list
- ✅ `PUT /api/tasklist/1` → Status 200 untuk approval

**Token lama sudah expired, butuh token baru dari browser!** 🔑