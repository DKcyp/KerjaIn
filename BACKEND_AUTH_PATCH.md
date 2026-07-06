# Backend Authentication Patch untuk Flutter Support

## 🚨 Problem
Backend API hanya mendukung Cookie session authentication, tidak mendukung API Key/Bearer token dari Flutter app.

## 🔧 Solution: Patch Authentication Logic

### 1. Update lib/auth.ts - Tambah API Key Support
```typescript
// lib/auth.ts - Tambahkan fungsi ini

/**
 * Parse session from multiple authentication methods
 * Supports: Cookie session, Bearer token, API Key header
 */
export function parseSessionFromRequest(req: Request): SessionPayload | null {
  // Method 1: Cookie session (existing)
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (session) {
      console.log('✅ Auth via Cookie session');
      return session;
    }
  }

  // Method 2: Bearer token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = verifySession(token);
    if (session) {
      console.log('✅ Auth via Bearer token');
      return session;
    }
  }

  // Method 3: X-API-Key header
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    const session = verifySession(apiKey);
    if (session) {
      console.log('✅ Auth via X-API-Key');
      return session;
    }
  }

  // Method 4: Custom headers for mobile app
  const mobileToken = req.headers.get('x-mobile-token') || req.headers.get('x-session-token');
  if (mobileToken) {
    const session = verifySession(mobileToken);
    if (session) {
      console.log('✅ Auth via Mobile token');
      return session;
    }
  }

  console.log('❌ No valid authentication found');
  return null;
}

/**
 * Enhanced session verification with better error handling
 */
export function verifySessionEnhanced(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  
  try {
    const session = verifySession(token);
    if (session) {
      console.log('✅ Session verified:', { id: session.id, role: session.role });
      return session;
    }
  } catch (error) {
    console.log('❌ Session verification failed:', error);
  }
  
  return null;
}
```

### 2. Update tasklist/[id]/route.ts - Ganti Authentication
```typescript
// src/app/api/tasklist/[id]/route.ts
// Ganti baris 632-634:

// SEBELUM (hanya Cookie):
const cookieHeader = req.headers.get('cookie');
const session = parseSessionFromCookieHeader(cookieHeader);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// SESUDAH (Multi-method):
const session = parseSessionFromRequest(req);
if (!session) {
  console.log('❌ Authentication failed - no valid session found');
  console.log('🔍 Headers received:', {
    cookie: req.headers.get('cookie'),
    authorization: req.headers.get('authorization'),
    'x-api-key': req.headers.get('x-api-key'),
    'x-mobile-token': req.headers.get('x-mobile-token'),
  });
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
console.log('✅ Authentication successful:', { id: session.id, role: session.role });
```

### 3. Update approval-queue/route.ts - Sama
```typescript
// src/app/api/tasklist/approval-queue/route.ts
// Ganti authentication logic:

const session = parseSessionFromRequest(req);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 4. Update approval-stats/route.ts - Sama
```typescript
// src/app/api/tasklist/approval-stats/route.ts
// Ganti authentication logic:

const session = parseSessionFromRequest(req);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## 🔑 Generate Valid Session Token

### Option 1: Login Programmatically dari Flutter
```dart
// Flutter - Login untuk get valid session
Future<String> loginAndGetSession() async {
  final response = await http.post(
    Uri.parse('http://192.168.1.10:3000/api/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: json.encode({
      'username': 'dian.nurwahid', // User yang sudah ada
      'password': 'password123',   // Password yang benar
    }),
  );
  
  if (response.statusCode == 200) {
    // Extract session dari Set-Cookie header
    final setCookie = response.headers['set-cookie'];
    if (setCookie != null) {
      final sessionMatch = RegExp(r'session=([^;]+)').firstMatch(setCookie);
      if (sessionMatch != null) {
        final sessionToken = sessionMatch.group(1)!;
        print('✅ Got valid session token: $sessionToken');
        return sessionToken;
      }
    }
  }
  
  throw Exception('Login failed');
}
```

### Option 2: Hardcode Valid Session (Temporary)
```dart
// Minta backend developer untuk generate session token untuk User ID 5 (Dian Nurwahid)
static const String validSessionToken = 'NEW_VALID_TOKEN_HERE';
```

## 🧪 Test Authentication Methods

### Flutter Test Code
```dart
class AuthTestService {
  static const String baseUrl = 'http://192.168.1.10:3000';
  
  Future<void> testAllAuthMethods() async {
    final sessionToken = await loginAndGetSession();
    
    // Test Method 1: Bearer token
    await testMethod('Bearer', {
      'Authorization': 'Bearer $sessionToken',
      'Content-Type': 'application/json',
    });
    
    // Test Method 2: X-API-Key
    await testMethod('X-API-Key', {
      'X-API-Key': sessionToken,
      'Content-Type': 'application/json',
    });
    
    // Test Method 3: Cookie (original)
    await testMethod('Cookie', {
      'Cookie': 'session=$sessionToken',
      'Content-Type': 'application/json',
    });
    
    // Test Method 4: Mobile token
    await testMethod('Mobile Token', {
      'X-Mobile-Token': sessionToken,
      'Content-Type': 'application/json',
    });
  }
  
  Future<void> testMethod(String methodName, Map<String, String> headers) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/tasklist/1'),
        headers: headers,
        body: json.encode({
          'status': 'SELESAI',
          'keterangan': 'Test $methodName authentication',
        }),
      );
      
      print('$methodName: ${response.statusCode} - ${response.body}');
    } catch (e) {
      print('$methodName: Error - $e');
    }
  }
}
```

## 🚀 Implementation Steps

1. **Update lib/auth.ts** dengan fungsi `parseSessionFromRequest`
2. **Update semua API routes** untuk menggunakan multi-method auth
3. **Generate valid session token** untuk User ID 5
4. **Update Flutter app** dengan session token yang valid
5. **Test semua authentication methods**

## 📝 Files to Modify

1. `src/lib/auth.ts` - Add multi-method authentication
2. `src/app/api/tasklist/[id]/route.ts` - Replace auth logic
3. `src/app/api/tasklist/approval-queue/route.ts` - Replace auth logic  
4. `src/app/api/tasklist/approval-stats/route.ts` - Replace auth logic
5. `src/app/api/tasklist/route.ts` - Replace auth logic (main list)

Setelah patch ini, Flutter app akan bisa authenticate dengan berbagai method! 🎉