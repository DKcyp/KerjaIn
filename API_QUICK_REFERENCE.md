# 🚀 API Quick Reference

## 📋 Endpoints Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/public/proyek` | GET | ❌ | List all projects |
| `/api/public/proyek?type=DEVELOPMENT` | GET | ❌ | Filter by type |
| `/api/public/proyek?isActive=all` | GET | ❌ | All projects (active + inactive) |
| `/api/public/proyek/{id}` | GET | ❌ | Get single project |
| `/api/public/proyek/{id}?includeModules=true` | GET | ❌ | Project + modules tree |
| `/api/public/proyek/{id}/modules` | GET | ❌ | Get project modules |

---

## 🔗 Base URL

**Local Development:**
```
http://localhost:3000
```

**Production:**
```
https://your-domain.com
```

---

## 📝 Quick Examples

### **1. Get All Active Projects**
```bash
curl http://localhost:3000/api/public/proyek
```

### **2. Get DEVELOPMENT Projects**
```bash
curl http://localhost:3000/api/public/proyek?type=DEVELOPMENT
```

### **3. Get Project by ID**
```bash
curl http://localhost:3000/api/public/proyek/1
```

### **4. Get Project with Modules**
```bash
curl http://localhost:3000/api/public/proyek/1?includeModules=true
```

### **5. Get Project Modules**
```bash
curl http://localhost:3000/api/public/proyek/1/modules
```

---

## 🎯 Query Parameters

### **For `/api/public/proyek`:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `type` | string | `BLUEPRINT`, `DEVELOPMENT`, `SUPPORT` | Filter by project type |
| `isActive` | string | `true`, `false`, `all` | Filter by active status |

### **For `/api/public/proyek/{id}`:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `includeModules` | boolean | `true`, `false` | Include modules tree |

---

## 📦 Response Structure

### **List Response:**
```json
{
  "success": true,
  "items": [...]
}
```

### **Single Item Response:**
```json
{
  "success": true,
  "item": {...}
}
```

### **Modules Response:**
```json
{
  "success": true,
  "projectId": 1,
  "modules": [...],  // flat list
  "tree": [...]      // nested tree
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🔓 Authentication

**NO AUTHENTICATION REQUIRED!**

All endpoints are public and can be accessed without:
- ❌ Session cookie
- ❌ API key
- ❌ Bearer token
- ❌ Basic auth

---

## 📊 HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request (invalid parameters) |
| `404` | Not Found (project/module not found) |
| `500` | Server Error |

---

## 💡 Tips

### **1. Testing with Browser**
Just paste URL in browser:
```
http://localhost:3000/api/public/proyek
```

### **2. Testing with JavaScript**
```javascript
const response = await fetch('http://localhost:3000/api/public/proyek');
const data = await response.json();
console.log(data.items);
```

### **3. Testing with Postman**
Import collection:
- `Logbook_Public_API.postman_collection.json`
- `Logbook_Environment.postman_environment.json`

### **4. Testing with cURL**
```bash
curl -X GET http://localhost:3000/api/public/proyek \
  -H "Content-Type: application/json"
```

---

## 🎨 Use Cases

### **Mobile App Integration**
```javascript
// Fetch projects for dropdown
const projects = await fetch('/api/public/proyek?isActive=true')
  .then(r => r.json())
  .then(d => d.items);
```

### **External Dashboard**
```javascript
// Get project with modules
const project = await fetch('/api/public/proyek/1?includeModules=true')
  .then(r => r.json())
  .then(d => d.item);
```

### **Third-party Integration**
```javascript
// Filter by type
const devProjects = await fetch('/api/public/proyek?type=DEVELOPMENT')
  .then(r => r.json())
  .then(d => d.items);
```

---

## 📁 Files Included

1. **Logbook_Public_API.postman_collection.json**
   - Postman collection with all endpoints
   - Pre-configured requests
   - Examples and descriptions

2. **Logbook_Environment.postman_environment.json**
   - Environment variables
   - `base_url` and `project_id`

3. **POSTMAN_GUIDE.md**
   - Detailed import guide
   - Setup instructions
   - Testing examples

4. **API_QUICK_REFERENCE.md** (this file)
   - Quick reference
   - Examples
   - Tips and tricks

---

## 🚀 Getting Started

1. **Import to Postman:**
   - Drag & drop JSON files to Postman
   - Select "Logbook - Local" environment

2. **Start Server:**
   ```bash
   npm run dev
   ```

3. **Test:**
   - Run "Get All Projects" request
   - Check response

4. **Done!** 🎉

---

**Need help? Check POSTMAN_GUIDE.md for detailed instructions.**
